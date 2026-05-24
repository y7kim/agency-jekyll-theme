---
title: "Разбор Lab1C (легко)"
permalink: /writeups/mbe/lab1c/
excerpt: "Разбор Lab1C."
---

---
MBE's **Lab01** are mainly focused on reverse engineering so, we don't have any source code (but who needs it). The first level (*Lab1C*) is quite simple and a good introduction to basic RCE. 

First, log into the Lab01 as **lab1C** (`lab1C:lab01start`) and go to the challenges folder:

```bash
$ ssh lab1C@<VM_IP>
$ cd /levels/lab01
```

Let's execute the program and see what is does:

```shell
lab1C@warzone:/levels/lab01$ ./lab1C
-----------------------------
--- RPISEC - CrackMe v1.0 ---
-----------------------------

Password: TestMe!    

Invalid Password!!!
lab1C@warzone:/levels/lab01$ 
```

The program is asking for a password and obviously, we don't have it. We'll need to do a bit of analysis to find out how our input is processed and what the password might be.

## Binary Analysis

In this first challenge, we don't really need to do any kind of dynamic analysis. If you read the assembly code, you should be able to figure out the password. 

You can easily disassemble the main routine with [GDB](https://www.gnu.org/software/gdb/). I added some comments to help you understand the code.

```nasm
gdb-peda$ disassemble main
Dump of assembler code for function main:
   0x080486ad <+0>:	push   ebp
   0x080486ae <+1>:	mov    ebp,esp
   0x080486b0 <+3>:	and    esp,0xfffffff0
   0x080486b3 <+6>:	sub    esp,0x20
   0x080486b6 <+9>:	mov    DWORD PTR [esp],0x80487d0
   0x080486bd <+16>:	call   0x8048560 <puts@plt> ; Print banner
   0x080486c2 <+21>:	mov    DWORD PTR [esp],0x80487ee
   0x080486c9 <+28>:	call   0x8048560 <puts@plt> ; Print banner
   0x080486ce <+33>:	mov    DWORD PTR [esp],0x80487d0
   0x080486d5 <+40>:	call   0x8048560 <puts@plt> ; Print banner
   0x080486da <+45>:	mov    DWORD PTR [esp],0x804880c
   0x080486e1 <+52>:	call   0x8048550 <printf@plt> ; Print "Password: "
   0x080486e6 <+57>:	lea    eax,[esp+0x1c]
   0x080486ea <+61>:	mov    DWORD PTR [esp+0x4],eax
   0x080486ee <+65>:	mov    DWORD PTR [esp],0x8048818
   0x080486f5 <+72>:	call   0x80485a0 <__isoc99_scanf@plt> ; Wait for user input
   0x080486fa <+77>:	mov    eax,DWORD PTR [esp+0x1c]
   0x080486fe <+81>:	cmp    eax,0x149a ; Test the password
   0x08048703 <+86>:	jne    0x8048724 <main+119> ; If incorrect password jump to <main+119>
   0x08048705 <+88>:	mov    DWORD PTR [esp],0x804881b
   0x0804870c <+95>:	call   0x8048560 <puts@plt>
   0x08048711 <+100>:	mov    DWORD PTR [esp],0x804882b
   0x08048718 <+107>:	call   0x8048570 <system@plt> ; Give shell for "lab1B"
   0x0804871d <+112>:	mov    eax,0x0
   0x08048722 <+117>:	jmp    0x8048735 <main+136>
   0x08048724 <+119>:	mov    DWORD PTR [esp],0x8048833
   0x0804872b <+126>:	call   0x8048560 <puts@plt> ; Print fail message
   0x08048730 <+131>:	mov    eax,0x1
   0x08048735 <+136>:	leave  
   0x08048736 <+137>:	ret    
End of assembler dump.
```

The interesting code is right here:

```nasm
0x080486e6 <+57>:	lea    eax,[esp+0x1c]
0x080486ea <+61>:	mov    DWORD PTR [esp+0x4],eax
0x080486ee <+65>:	mov    DWORD PTR [esp],0x8048818
0x080486f5 <+72>:	call   0x80485a0 <__isoc99_scanf@plt>
0x080486fa <+77>:	mov    eax,DWORD PTR [esp+0x1c]
0x080486fe <+81>:	cmp    eax,0x149a
```

The *scanf()* function reads data from *stdin* and stores it according to the parameter *format* into the locations pointed by the additional argument.

```c
int scanf ( const char * format, ... );
```

Here, the arguments are placed in reverse order on the stack so, `0x080486ea <+61>: mov DWORD PTR [esp+0x4],eax` points to an allocated space on the stack for our input and `0x080486ee <+65>: mov DWORD PTR [esp],0x8048818` contains the format expected. We can check the format expected by using **GDB**:

```nasm
gdb-peda$ x/s 0x8048818
0x8048818:	"%d"
```

As we can see, the program expects a decimal integer: **"%d"** (and not a string). Then, our input is compared to **0x149a**, which equals to **5274** in decimal. So, the password should be **5274**.

## Решение

Now that we have analyzed how the input is handled, let's try it again and solve this challenge.

```shell
lab1C@warzone:/levels/lab01$ ./lab1C
-----------------------------
--- RPISEC - CrackMe v1.0 ---
-----------------------------

Password: 5274

Authenticated!
$ whoami
lab1B
$ cat /home/lab1B/.pass
n0_str1ngs_n0_pr0bl3m
```

Solved! Let's tackle the next [challenge](/writeups/mbe/lab1b/)!
