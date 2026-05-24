---
title: "Разбор Lab1B (средне)"
permalink: /writeups/mbe/lab1b/
excerpt: "Разбор Lab1B."
---

---
**Lab1B** is quite similar to the previous challenge. First, log into the Lab01 as **lab1B** (`lab1B:n0_str1ngs_n0_pr0bl3m`) and go to the challenges folder:

```shell
$ ssh lab1B@<VM_IP>
$ cd /levels/lab01/
```

Let's try to execute the program:

```shell
lab1B@warzone:/levels/lab01$ ./lab1B
.---------------------------.
|-- RPISEC - CrackMe v2.0 --|
'---------------------------'

Password: TestMe!

Invalid Password!
```

Like in the previous level, the program is asking for a password. Let's execute `gdb` and see what happens.

## Binary Analysis

This time, the code is composed of (mainly) 3 functions (**main**, **test** and **decrypt**). Let's reverse the first one.

### *main()* function 

Nothing to say here, it is the same process as the previous challenge. The user input should be a decimal.

```nasm
gdb-peda$ disassemble main
Dump of assembler code for function main:
   0x08048be4 <+0>:  push   ebp
   0x08048be5 <+1>:  mov    ebp,esp
   0x08048be7 <+3>:  and    esp,0xfffffff0
   0x08048bea <+6>:  sub    esp,0x20
   0x08048bed <+9>:  push   eax
   0x08048bee <+10>: xor    eax,eax
   0x08048bf0 <+12>: je     0x8048bf5 <main+17>
   0x08048bf2 <+14>: add    esp,0x4
   0x08048bf5 <+17>: pop    eax
   0x08048bf6 <+18>: mov    DWORD PTR [esp],0x0
   0x08048bfd <+25>: call   0x80487b0 <time@plt>
   0x08048c02 <+30>: mov    DWORD PTR [esp],eax
   0x08048c05 <+33>: call   0x8048800 <srand@plt>
   0x08048c0a <+38>: mov    DWORD PTR [esp],0x8048d88
   0x08048c11 <+45>: call   0x80487d0 <puts@plt>
   0x08048c16 <+50>: mov    DWORD PTR [esp],0x8048da6
   0x08048c1d <+57>: call   0x80487d0 <puts@plt>
   0x08048c22 <+62>: mov    DWORD PTR [esp],0x8048dc4
   0x08048c29 <+69>: call   0x80487d0 <puts@plt>
   0x08048c2e <+74>: mov    DWORD PTR [esp],0x8048de2
   0x08048c35 <+81>: call   0x8048780 <printf@plt>
   0x08048c3a <+86>: lea    eax,[esp+0x1c]
   0x08048c3e <+90>: mov    DWORD PTR [esp+0x4],eax
   0x08048c42 <+94>: mov    DWORD PTR [esp],0x8048dee ; format = "%d"
   0x08048c49 <+101>:   call   0x8048840 <__isoc99_scanf@plt>
   0x08048c4e <+106>:   mov    eax,DWORD PTR [esp+0x1c]
   0x08048c52 <+110>:   mov    DWORD PTR [esp+0x4],0x1337d00d
   0x08048c5a <+118>:   mov    DWORD PTR [esp],eax ; ptr to user input
   0x08048c5d <+121>:   call   0x8048a74 <test>
   0x08048c62 <+126>:   mov    eax,0x0
   0x08048c67 <+131>:   leave  
   0x08048c68 <+132>:   ret    
End of assembler dump.
```

As we can see, the user input as well as another value (**0x1337d00d**) are passed as arguments to the *test()* function.

### *test()* function

The *test()* function is quite long and is in fact a *switch* statement. Take a look at the comments below.

```nasm
gdb-peda$ disassemble test
Dump of assembler code for function test:
   0x08048a74 <+0>:  push   ebp
   0x08048a75 <+1>:  mov    ebp,esp
   0x08048a77 <+3>:  sub    esp,0x28
   0x08048a7a <+6>:  mov    eax,DWORD PTR [ebp+0x8] ; eax = user input
   0x08048a7d <+9>:  mov    edx,DWORD PTR [ebp+0xc] ; edx = 0x1337d00d
   0x08048a80 <+12>: sub    edx,eax ; edx = eax-edx
   0x08048a82 <+14>: mov    eax,edx ; put edx in eax 
   0x08048a84 <+16>: mov    DWORD PTR [ebp-0xc],eax
   0x08048a87 <+19>: cmp    DWORD PTR [ebp-0xc],0x15 ; compare eax to 0x15
   0x08048a8b <+23>: ja     0x8048bd5 <test+353> ; if eax > 0x15 go to <test+353>
   0x08048a91 <+29>: mov    eax,DWORD PTR [ebp-0xc]
   0x08048a94 <+32>: shl    eax,0x2 ; equivalent to EAX * 4
   0x08048a97 <+35>: add    eax,0x8048d30 ; eax + 0x8048d30
   0x08048a9c <+40>: mov    eax,DWORD PTR [eax] ; eax = value pointed by eax
   0x08048a9e <+42>: jmp    eax ; go to the corresponding case
   0x08048aa0 <+44>: mov    eax,DWORD PTR [ebp-0xc]
   0x08048aa3 <+47>: mov    DWORD PTR [esp],eax
   0x08048aa6 <+50>: call   0x80489b7 <decrypt>
   0x08048aab <+55>: jmp    0x8048be2 <test+366>

   ...[snip]...
   
   0x08048bc8 <+340>:   mov    eax,DWORD PTR [ebp-0xc]
   0x08048bcb <+343>:   mov    DWORD PTR [esp],eax
   0x08048bce <+346>:   call   0x80489b7 <decrypt>
   0x08048bd3 <+351>:   jmp    0x8048be2 <test+366>
   0x08048bd5 <+353>:   call   0x8048830 <rand@plt>
   0x08048bda <+358>:   mov    DWORD PTR [esp],eax
   0x08048bdd <+361>:   call   0x80489b7 <decrypt>
   0x08048be2 <+366>:   leave  
   0x08048be3 <+367>:   ret    
End of assembler dump.
```

So, let me clarify what happens... First, if you take a look at **0x8048d30** (check *<test+35>*), we have some kind of pointers table. Those pointers point to the different cases of the *switch* statement.

```shell
gdb-peda$ x/30x 0x8048d30
0x8048d30:  0x08048bd5  0x08048aa0  0x08048ab0  0x08048ac0
0x8048d40:  0x08048ad0  0x08048ae0  0x08048af0  0x08048b00
0x8048d50:  0x08048b10  0x08048b20  0x08048b30  0x08048b40
0x8048d60:  0x08048b50  0x08048b60  0x08048b6d  0x08048b7a
0x8048d70:  0x08048b87  0x08048b94  0x08048ba1  0x08048bae
0x8048d80:  0x08048bbb  0x08048bc8  0x2d2d2d2e  0x2d2d2d2d
0x8048d90:  0x2d2d2d2d  0x2d2d2d2d  0x2d2d2d2d  0x2d2d2d2d
0x8048da0:  0x2d2d2d2d  0x2d7c002e
```

So, let's say we want to go to the second case : **0x08048aa0** (the first one is the *default*), we need to make sure that when we reach **<test+40>**, EAX must be equal to **0x8048d34**. As the case depends on our input, we must insert the following decimal value: **322424844** (0x1337d00d - 1).

```nasm
gdb-peda$ break *test+40
Breakpoint 1 at 0x8048a9c
gdb-peda$ run
Starting program: /levels/lab01/lab1B 
.---------------------------.
|-- RPISEC - CrackMe v2.0 --|
'---------------------------'

Password: 322424844
[----------------------------------registers-----------------------------------]
EAX: 0x8048d34 --> 0x8048aa0 (<test+44>:  mov    eax,DWORD PTR [ebp-0xc])
EBX: 0xb7746000 --> 0x1a9da8 
ECX: 0xb77478a4 --> 0x0 
EDX: 0x1 
ESI: 0x0 
EDI: 0x0 
EBP: 0xbf8de6d8 --> 0xbf8de708 --> 0x0 
ESP: 0xbf8de6b0 --> 0xb7746c20 --> 0xfbad2288 
EIP: 0x8048a9c (<test+40>: mov    eax,DWORD PTR [eax])
EFLAGS: 0x202 (carry parity adjust zero sign trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x8048a91 <test+29>: mov    eax,DWORD PTR [ebp-0xc]
   0x8048a94 <test+32>: shl    eax,0x2
   0x8048a97 <test+35>: add    eax,0x8048d30
=> 0x8048a9c <test+40>: mov    eax,DWORD PTR [eax]
   0x8048a9e <test+42>: jmp    eax
   0x8048aa0 <test+44>: mov    eax,DWORD PTR [ebp-0xc]
   0x8048aa3 <test+47>: mov    DWORD PTR [esp],eax
   0x8048aa6 <test+50>: call   0x80489b7 <decrypt>
[------------------------------------stack-------------------------------------]
0000| 0xbf8de6b0 --> 0xb7746c20 --> 0xfbad2288 
0004| 0xbf8de6b4 --> 0x8048dee --> 0x6425 ('%d')
0008| 0xbf8de6b8 --> 0xbf8de6e4 --> 0x1337d00d 
0012| 0xbf8de6bc --> 0x0 
0016| 0xbf8de6c0 --> 0xbf8de708 --> 0x0 
0020| 0xbf8de6c4 --> 0xb776b500 (<_dl_runtime_resolve+16>:  pop    edx)
0024| 0xbf8de6c8 --> 0xb75f1f49 (<__isoc99_scanf+9>:  add    ebx,0x1540b7)
0028| 0xbf8de6cc --> 0x1 
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x08048a9c in test ()
```

As you can see, EAX contains the proper value and we'll execute the following code and call **decrypt** by passing '1' as an argument (it's the case number).

```nasm
0x08048aa0 <+44>: mov    eax,DWORD PTR [ebp-0xc]
0x08048aa3 <+47>: mov    DWORD PTR [esp],eax
0x08048aa6 <+50>: call   0x80489b7 <decrypt>
```

### *decrypt()* function

I won't detail the whole code but, basically, it loads a string in memory and try to decrypt it with our "Case" number (from the switch statement) using the XOR instruction. Once the whole string is decrypted, it compares it to another string: "Congratulations!".

If the decrypted string equals to "Congratulations!", we get a shell with elevated privileges.

```nasm
gdb-peda$ disassemble decrypt 
Dump of assembler code for function decrypt:
   0x080489b7 <+0>:  push   ebp
   0x080489b8 <+1>:  mov    ebp,esp
   0x080489ba <+3>:  sub    esp,0x38
   0x080489bd <+6>:  mov    eax,gs:0x14
   0x080489c3 <+12>: mov    DWORD PTR [ebp-0xc],eax ; store the argument @[ebp-0xc]
   0x080489c6 <+15>: xor    eax,eax ; EAX = 0
   0x080489c8 <+17>: mov    DWORD PTR [ebp-0x1d],0x757c7d51 ; encrypted string
   0x080489cf <+24>: mov    DWORD PTR [ebp-0x19],0x67667360 ; encrypted string
   0x080489d6 <+31>: mov    DWORD PTR [ebp-0x15],0x7b66737e ; encrypted string
   0x080489dd <+38>: mov    DWORD PTR [ebp-0x11],0x33617c7d ; encrypted string
   0x080489e4 <+45>: mov    BYTE PTR [ebp-0xd],0x0 ; string = "Q}|u`sfg~sf{}|a3"
   0x080489e8 <+49>: push   eax
   0x080489e9 <+50>: xor    eax,eax
   0x080489eb <+52>: je     0x80489f0 <decrypt+57>
   0x080489ed <+54>: add    esp,0x4
   0x080489f0 <+57>: pop    eax
   0x080489f1 <+58>: lea    eax,[ebp-0x1d]
   0x080489f4 <+61>: mov    DWORD PTR [esp],eax
   0x080489f7 <+64>: call   0x8048810 <strlen@plt>
   0x080489fc <+69>: mov    DWORD PTR [ebp-0x24],eax
   0x080489ff <+72>: mov    DWORD PTR [ebp-0x28],0x0
   0x08048a06 <+79>: jmp    0x8048a28 <decrypt+113>
   0x08048a08 <+81>: lea    edx,[ebp-0x1d]
   0x08048a0b <+84>: mov    eax,DWORD PTR [ebp-0x28]
   0x08048a0e <+87>: add    eax,edx
   0x08048a10 <+89>: movzx  eax,BYTE PTR [eax]
   0x08048a13 <+92>: mov    edx,eax
   0x08048a15 <+94>: mov    eax,DWORD PTR [ebp+0x8]
   0x08048a18 <+97>: xor    eax,edx
   0x08048a1a <+99>: lea    ecx,[ebp-0x1d]
   0x08048a1d <+102>:   mov    edx,DWORD PTR [ebp-0x28]
   0x08048a20 <+105>:   add    edx,ecx
   0x08048a22 <+107>:   mov    BYTE PTR [edx],al
   0x08048a24 <+109>:   add    DWORD PTR [ebp-0x28],0x1
   0x08048a28 <+113>:   mov    eax,DWORD PTR [ebp-0x28]
   0x08048a2b <+116>:   cmp    eax,DWORD PTR [ebp-0x24]
   0x08048a2e <+119>:   jb     0x8048a08 <decrypt+81>
   0x08048a30 <+121>:   mov    DWORD PTR [esp+0x4],0x8048d03
   0x08048a38 <+129>:   lea    eax,[ebp-0x1d]
   0x08048a3b <+132>:   mov    DWORD PTR [esp],eax
   0x08048a3e <+135>:   call   0x8048770 <strcmp@plt> ; check if the strings are identical
   0x08048a43 <+140>:   test   eax,eax
   0x08048a45 <+142>:   jne    0x8048a55 <decrypt+158> ; exit if comparison failed
   0x08048a47 <+144>:   mov    DWORD PTR [esp],0x8048d14 ; move "/bin/sh" point on the stack
   0x08048a4e <+151>:   call   0x80487e0 <system@plt> ; get a shell!
   0x08048a53 <+156>:   jmp    0x8048a61 <decrypt+170>
   0x08048a55 <+158>:   mov    DWORD PTR [esp],0x8048d1c
   0x08048a5c <+165>:   call   0x80487d0 <puts@plt>
   0x08048a61 <+170>:   mov    eax,DWORD PTR [ebp-0xc]
   0x08048a64 <+173>:   xor    eax,DWORD PTR gs:0x14
   0x08048a6b <+180>:   je     0x8048a72 <decrypt+187>
   0x08048a6d <+182>:   call   0x80487c0 <__stack_chk_fail@plt>
   0x08048a72 <+187>:   leave  
   0x08048a73 <+188>:   ret    
End of assembler dump.
```

As I was a bit lazy, I just extracted the encrypted string from memory and tried to bruteforce it with different numbers:

```python
encrypt = "Q}|u`sfg~sf{}|a3"

for key in range(20):
    decrypt = ""
    for char in encrypt:
        decrypt += chr(ord(char) ^ key)

    print("Key #" + str(key) + " = " + decrypt)
```

and got the following result :
```bash
Key #18 = Congratulations!
```

So, the case number 18 should give us a shell. The password should be the following decimal value: **322424827** (0x1337d00d - 0x12 (18 in decimal))

## Решение

Now that we have reversed how the input is handled, let's try it again and solve this challenge.

```shell
lab1B@warzone:/levels/lab01$ ./lab1B
.---------------------------.
|-- RPISEC - CrackMe v2.0 --|
'---------------------------'

Password: 322424827
$ whoami
lab1A
$ cat /home/lab1A/.pass
1337_3nCRyptI0n_br0
```

Yay! Next [one](/writeups/mbe/lab1a/)!
