---
title: "Разбор Lab1A (сложно)"
permalink: /writeups/mbe/lab1a/
excerpt: "Разбор Lab1A."
---

---
With the last challenge, **Lab1A**, we'll have to write a simple keygen to find which **password** we'll have to use depending on the **username**. 

First, log into the Lab01 as **Lab1A** (`lab1A:1337_3nCRyptI0n_br0`) and go to the challenges folder:

```shell
$ ssh lab1A@<VM_IP>
$ cd /levels/lab01/
```

Let's execute the program:

```shell
lab1A@warzone:/levels/lab01$ ./lab1A
.---------------------------.
|---------  RPISEC  --------|
|+ SECURE LOGIN SYS v. 3.0 +|
|---------------------------|
|~- Enter your Username:  ~-|
'---------------------------'
ax        
.---------------------------.
| !! NEW ACCOUNT DETECTED !!|
|---------------------------|
|~- Input your serial:    ~-|
'---------------------------'
12345
```

No errors, but no shell. We'll need to dig further...

## Binary Analysis

This time, the code is composed of 2 interesting functions (**main** and **auth**). Let's reverse the first one.

### *main()* function 

In this program, we have to send 2 parameters: a *username* and a *password*.

```nasm
gdb-peda$ disas main
Dump of assembler code for function main:
   0x08048b44 <+0>: push   ebp
   0x08048b45 <+1>: mov    ebp,esp
   0x08048b47 <+3>: and    esp,0xfffffff0
   0x08048b4a <+6>: sub    esp,0x40
   0x08048b4d <+9>: mov    eax,DWORD PTR [ebp+0xc]
   0x08048b50 <+12>:    mov    DWORD PTR [esp+0xc],eax
   0x08048b54 <+16>:    mov    eax,gs:0x14
   0x08048b5a <+22>:    mov    DWORD PTR [esp+0x3c],eax
   0x08048b5e <+26>:    xor    eax,eax
   0x08048b60 <+28>:    push   eax
   0x08048b61 <+29>:    xor    eax,eax
   0x08048b63 <+31>:    je     0x8048b68 <main+36>
   0x08048b65 <+33>:    add    esp,0x4
   0x08048b68 <+36>:    pop    eax
   0x08048b69 <+37>:    mov    DWORD PTR [esp],0x8048d73
   0x08048b70 <+44>:    call   0x8048810 <puts@plt>
   0x08048b75 <+49>:    mov    DWORD PTR [esp],0x8048d91
   0x08048b7c <+56>:    call   0x8048810 <puts@plt>
   0x08048b81 <+61>:    mov    DWORD PTR [esp],0x8048daf
   0x08048b88 <+68>:    call   0x8048810 <puts@plt>
   0x08048b8d <+73>:    mov    DWORD PTR [esp],0x8048dcd
   0x08048b94 <+80>:    call   0x8048810 <puts@plt>
   0x08048b99 <+85>:    mov    DWORD PTR [esp],0x8048deb
   0x08048ba0 <+92>:    call   0x8048810 <puts@plt>
   0x08048ba5 <+97>:    mov    DWORD PTR [esp],0x8048e09
   0x08048bac <+104>:   call   0x8048810 <puts@plt>
   0x08048bb1 <+109>:   mov    eax,ds:0x804b060
   0x08048bb6 <+114>:   mov    DWORD PTR [esp+0x8],eax
   0x08048bba <+118>:   mov    DWORD PTR [esp+0x4],0x20
   0x08048bc2 <+126>:   lea    eax,[esp+0x1c]
   0x08048bc6 <+130>:   mov    DWORD PTR [esp],eax
   0x08048bc9 <+133>:   call   0x80487d0 <fgets@plt> ; Get the username
   0x08048bce <+138>:   mov    DWORD PTR [esp],0x8048d73
   0x08048bd5 <+145>:   call   0x8048810 <puts@plt>
   0x08048bda <+150>:   mov    DWORD PTR [esp],0x8048e27
   0x08048be1 <+157>:   call   0x8048810 <puts@plt>
   0x08048be6 <+162>:   mov    DWORD PTR [esp],0x8048dcd
   0x08048bed <+169>:   call   0x8048810 <puts@plt>
   0x08048bf2 <+174>:   mov    DWORD PTR [esp],0x8048e45
   0x08048bf9 <+181>:   call   0x8048810 <puts@plt>
   0x08048bfe <+186>:   mov    DWORD PTR [esp],0x8048e09
   0x08048c05 <+193>:   call   0x8048810 <puts@plt>
   0x08048c0a <+198>:   lea    eax,[esp+0x18]
   0x08048c0e <+202>:   mov    DWORD PTR [esp+0x4],eax
   0x08048c12 <+206>:   mov    DWORD PTR [esp],0x8048d00
   0x08048c19 <+213>:   call   0x8048860 <__isoc99_scanf@plt> ; get the password
   0x08048c1e <+218>:   mov    eax,DWORD PTR [esp+0x18]
   0x08048c22 <+222>:   mov    DWORD PTR [esp+0x4],eax
   0x08048c26 <+226>:   lea    eax,[esp+0x1c]
   0x08048c2a <+230>:   mov    DWORD PTR [esp],eax
   0x08048c2d <+233>:   call   0x8048a0f <auth>
   0x08048c32 <+238>:   test   eax,eax
   0x08048c34 <+240>:   jne    0x8048c55 <main+273>
   0x08048c36 <+242>:   mov    DWORD PTR [esp],0x8048e63
   0x08048c3d <+249>:   call   0x8048810 <puts@plt>
   0x08048c42 <+254>:   mov    DWORD PTR [esp],0x8048e72
   0x08048c49 <+261>:   call   0x8048820 <system@plt>
   0x08048c4e <+266>:   mov    eax,0x0
   0x08048c53 <+271>:   jmp    0x8048c5a <main+278>
   0x08048c55 <+273>:   mov    eax,0x1
   0x08048c5a <+278>:   mov    edx,DWORD PTR [esp+0x3c]
   0x08048c5e <+282>:   xor    edx,DWORD PTR gs:0x14
   0x08048c65 <+289>:   je     0x8048c6c <main+296>
   0x08048c67 <+291>:   call   0x8048800 <__stack_chk_fail@plt>
   0x08048c6c <+296>:   leave  
   0x08048c6d <+297>:   ret    
End of assembler dump.
```

The interesting part of this function is right after the *scanf()* call.

```nasm
0x08048c19 <+213>:  call   0x8048860 <__isoc99_scanf@plt> ; Get password
0x08048c1e <+218>:  mov    eax,DWORD PTR [esp+0x18] ; Store pass in EAX
0x08048c22 <+222>:  mov    DWORD PTR [esp+0x4],eax ; Store EAX on the stack
0x08048c26 <+226>:  lea    eax,[esp+0x1c] ; Load the ptr of the username in EAX
0x08048c2a <+230>:  mov    DWORD PTR [esp],eax ; Push the ptr on the stack
0x08048c2d <+233>:  call   0x8048a0f <auth> ; Call the auth() function
0x08048c32 <+238>:  test   eax,eax ; Test the result of auth()
0x08048c34 <+240>:  jne    0x8048c55 <main+273> ; Exit the program (no message)
0x08048c36 <+242>:  mov    DWORD PTR [esp],0x8048e63 ; "Authenticated!"
0x08048c3d <+249>:  call   0x8048810 <puts@plt> ; print "Authenticated!"
0x08048c42 <+254>:  mov    DWORD PTR [esp],0x8048e72 ; "/bin/sh"
0x08048c49 <+261>:  call   0x8048820 <system@plt> ; WIN !
```

So, as you can see, we call *auth()* with 2 arguments. Depending on the result, we get a shell or the program exit without notice.

### *auth()* function 

If we take a look at the disassembly of the *auth()* function, you can see it processes our arguments with multiple logic operations. We also have a little anti-debug trick implemented within the code.

Let me comment some parts of the code to get you started!

```nasm
gdb-peda$ disassemble auth
Dump of assembler code for function auth:
   0x08048a0f <+0>: push   ebp
   0x08048a10 <+1>: mov    ebp,esp
   0x08048a12 <+3>: sub    esp,0x28
   0x08048a15 <+6>: mov    DWORD PTR [esp+0x4],0x8048d03 ; Contains "\n"
   0x08048a1d <+14>:    mov    eax,DWORD PTR [ebp+0x8] ; Pointer to username in EAX
   0x08048a20 <+17>:    mov    DWORD PTR [esp],eax ; Then pointer to username on the stack
   0x08048a23 <+20>:    call   0x80487a0 <strcspn@plt> ; Get the number of chars before "\n"
   0x08048a28 <+25>:    mov    edx,DWORD PTR [ebp+0x8] ; Pointer to username in EDX
   0x08048a2b <+28>:    add    eax,edx
   0x08048a2d <+30>:    mov    BYTE PTR [eax],0x0
   0x08048a30 <+33>:    mov    DWORD PTR [esp+0x4],0x20
   0x08048a38 <+41>:    mov    eax,DWORD PTR [ebp+0x8]
   0x08048a3b <+44>:    mov    DWORD PTR [esp],eax
   0x08048a3e <+47>:    call   0x8048850 <strnlen@plt>
   0x08048a43 <+52>:    mov    DWORD PTR [ebp-0xc],eax
   0x08048a46 <+55>:    push   eax
   0x08048a47 <+56>:    xor    eax,eax
   0x08048a49 <+58>:    je     0x8048a4e <auth+63>
   0x08048a4b <+60>:    add    esp,0x4
   0x08048a4e <+63>:    pop    eax
   0x08048a4f <+64>:    cmp    DWORD PTR [ebp-0xc],0x5
   0x08048a53 <+68>:    jg     0x8048a5f <auth+80>
   0x08048a55 <+70>:    mov    eax,0x1
   0x08048a5a <+75>:    jmp    0x8048b42 <auth+307>
   ; START AntiDebug Trick
   0x08048a5f <+80>:    mov    DWORD PTR [esp+0xc],0x0
   0x08048a67 <+88>:    mov    DWORD PTR [esp+0x8],0x1
   0x08048a6f <+96>:    mov    DWORD PTR [esp+0x4],0x0
   0x08048a77 <+104>:   mov    DWORD PTR [esp],0x0
   0x08048a7e <+111>:   call   0x8048870 <ptrace@plt>
   0x08048a83 <+116>:   cmp    eax,0xffffffff
   ; END AntiDebug Trick
   0x08048a86 <+119>:   jne    0x8048ab6 <auth+167>
   0x08048a88 <+121>:   mov    DWORD PTR [esp],0x8048d08
   0x08048a8f <+128>:   call   0x8048810 <puts@plt>
   0x08048a94 <+133>:   mov    DWORD PTR [esp],0x8048d2c
   0x08048a9b <+140>:   call   0x8048810 <puts@plt>
   0x08048aa0 <+145>:   mov    DWORD PTR [esp],0x8048d50
   0x08048aa7 <+152>:   call   0x8048810 <puts@plt>
   0x08048aac <+157>:   mov    eax,0x1
   0x08048ab1 <+162>:   jmp    0x8048b42 <auth+307> ; Exit if you run the code in GDB
   0x08048ab6 <+167>:   mov    eax,DWORD PTR [ebp+0x8] ; Load username in EAX
   0x08048ab9 <+170>:   add    eax,0x3
   0x08048abc <+173>:   movzx  eax,BYTE PTR [eax]
   0x08048abf <+176>:   movsx  eax,al
   0x08048ac2 <+179>:   xor    eax,0x1337
   0x08048ac7 <+184>:   add    eax,0x5eeded ; password = (ord(user[3]) ^ 0x1337) + 0x5eeded
   0x08048acc <+189>:   mov    DWORD PTR [ebp-0x10],eax
   0x08048acf <+192>:   mov    DWORD PTR [ebp-0x14],0x0
   0x08048ad6 <+199>:   jmp    0x8048b26 <auth+279>
   0x08048ad8 <+201>:   mov    edx,DWORD PTR [ebp-0x14]
   0x08048adb <+204>:   mov    eax,DWORD PTR [ebp+0x8]
   0x08048ade <+207>:   add    eax,edx
   0x08048ae0 <+209>:   movzx  eax,BYTE PTR [eax]
   0x08048ae3 <+212>:   cmp    al,0x1f
   0x08048ae5 <+214>:   jg     0x8048aee <auth+223>
   0x08048ae7 <+216>:   mov    eax,0x1
   0x08048aec <+221>:   jmp    0x8048b42 <auth+307>
   0x08048aee <+223>:   mov    edx,DWORD PTR [ebp-0x14]
   0x08048af1 <+226>:   mov    eax,DWORD PTR [ebp+0x8]
   0x08048af4 <+229>:   add    eax,edx
   0x08048af6 <+231>:   movzx  eax,BYTE PTR [eax]
   0x08048af9 <+234>:   movsx  eax,al
   0x08048afc <+237>:   xor    eax,DWORD PTR [ebp-0x10]
   0x08048aff <+240>:   mov    ecx,eax
   0x08048b01 <+242>:   mov    edx,0x88233b2b
   0x08048b06 <+247>:   mov    eax,ecx
   0x08048b08 <+249>:   mul    edx ; EAX * 0x88233b2b = [EDX:EAX]
   0x08048b0a <+251>:   mov    eax,ecx
   0x08048b0c <+253>:   sub    eax,edx ; EAX - EDX (High-order bytes of the MUL operand)
   0x08048b0e <+255>:   shr    eax,1 ; EAX/2
   0x08048b10 <+257>:   add    eax,edx ; EAX + EDX
   0x08048b12 <+259>:   shr    eax,0xa ; EAX/1024
   0x08048b15 <+262>:   imul   eax,eax,0x539 ; EAX = EAX*0x539
   0x08048b1b <+268>:   sub    ecx,eax ; EAX = ECX - EAX
   0x08048b1d <+270>:   mov    eax,ecx
   0x08048b1f <+272>:   add    DWORD PTR [ebp-0x10],eax ; Serial + eax
   0x08048b22 <+275>:   add    DWORD PTR [ebp-0x14],0x1 ; Counter++
   0x08048b26 <+279>:   mov    eax,DWORD PTR [ebp-0x14] 
   0x08048b29 <+282>:   cmp    eax,DWORD PTR [ebp-0xc]
   0x08048b2c <+285>:   jl     0x8048ad8 <auth+201> ; If counter < username size goto auth+201
   0x08048b2e <+287>:   mov    eax,DWORD PTR [ebp+0xc]
   0x08048b31 <+290>:   cmp    eax,DWORD PTR [ebp-0x10]
   0x08048b34 <+293>:   je     0x8048b3d <auth+302> ; Good boy
   0x08048b36 <+295>:   mov    eax,0x1
   0x08048b3b <+300>:   jmp    0x8048b42 <auth+307> ; Bad boy
   0x08048b3d <+302>:   mov    eax,0x0
   0x08048b42 <+307>:   leave  
   0x08048b43 <+308>:   ret    
End of assembler dump.
```

The anti-debug trick is using the **ptrace()** function.

```nasm
0x08048a5f <+80>:   mov    DWORD PTR [esp+0xc],0x0
0x08048a67 <+88>:   mov    DWORD PTR [esp+0x8],0x1
0x08048a6f <+96>:   mov    DWORD PTR [esp+0x4],0x0
0x08048a77 <+104>:  mov    DWORD PTR [esp],0x0
0x08048a7e <+111>:  call   0x8048870 <ptrace@plt>
0x08048a83 <+116>:  cmp    eax,0xffffffff
0x08048a86 <+119>:  jne    0x8048ab6 <auth+167>
0x08048a88 <+121>:  mov    DWORD PTR [esp],0x8048d08
0x08048a8f <+128>:  call   0x8048810 <puts@plt>
0x08048a94 <+133>:  mov    DWORD PTR [esp],0x8048d2c
0x08048a9b <+140>:  call   0x8048810 <puts@plt>
0x08048aa0 <+145>:  mov    DWORD PTR [esp],0x8048d50
0x08048aa7 <+152>:  call   0x8048810 <puts@plt>
0x08048aac <+157>:  mov    eax,0x1
0x08048ab1 <+162>:  jmp    0x8048b42 <auth+307>
```

If you run the progam into **GDB** you will have the following error:

```shell
.---------------------------.
| !! TAMPERING DETECTED !!  |
'---------------------------'
[Inferior 1 (process 1099) exited with code 01]
Warning: not running or target is remote
```

Basically, here is what it does :

```c
if (ptrace(PTRACE_TRACEME, 0, 1, 0) == -1) {
    printf(".---------------------------.\n");
    printf("| !! TAMPERING DETECTED !!  |\n");
    printf("'---------------------------'\n");
    exit(1);
}
else {  
    // Continue execution
}
```

To bypass this trick, we need to make sure that **EAX = 0** in the following operation `0x08048a83 <+116>: cmp eax, 0xffffffff`. To do that, we'll leverage the scripting capabilities of **GDB** by catching the *ptrace()* call and modify the *EAX* value to zero.

Restart **GDB** and type the following commands. Don't forget to place a breakpoint right after the operation (the best place would be **<auth+167>**).

```nasm
gdb-peda$ catch syscall ptrace
Catchpoint 1 (syscall 'ptrace' [26])
gdb-peda$ commands 1
Type commands for breakpoint(s) 1, one per line.
End with a line saying just "end".
>set ($eax) = 0
>continue
>end
gdb-peda$ b *auth+167
Breakpoint 2 at 0x8048ab6
gdb-peda$ run
Starting program: /levels/lab01/lab1A 
.---------------------------.
|---------  RPISEC  --------|
|+ SECURE LOGIN SYS v. 3.0 +|
|---------------------------|
|~- Enter your Username:  ~-|
'---------------------------'
ax
.---------------------------.
| !! NEW ACCOUNT DETECTED !!|
|---------------------------|
|~- Input your serial:    ~-|
'---------------------------'
12345

Catchpoint 1 (returned from syscall ptrace), 0xb7710d4c in __kernel_vsyscall ()

Breakpoint 2, 0x08048ab6 in auth ()
```

As you can see, we can continue to debug the program without any issue. However, it is not really necessary to bypass the anti-debug trick as we mainly need to reverse the algorithm to find a way to generate a key based on the provided username.

Here, we can easily write a quick keygen in Python to find the right password (which depend on the username)

```python
user = "axcheron"
pswd = (ord(user[3]) ^ 0x1337) + 0x5eeded

def mul(a, b):
    res = a * b
    return (res & 0xFFFFFFFF), (res & (0xFFFFFFFF << 32)) >> 32

for c in range(len(user)):
    eax = ord(user[c]) ^ pswd
    ecx = eax

    eax, edx = mul(eax, 0x88233b2b)
    eax = ecx

    eax = ((((eax - edx) // 2) + edx) // 1024) * 0x539
    pswd += (ecx - eax)

print("%u" % pswd)

``` 

We get the following result : **6234472**

## Решение

Now that we have reversed the algorithm and wrote a keygen, let's try it again and solve this challenge.

```shell
lab1A@warzone:/levels/lab01$ ./lab1A 
.---------------------------.
|---------  RPISEC  --------|
|+ SECURE LOGIN SYS v. 3.0 +|
|---------------------------|
|~- Enter your Username:  ~-|
'---------------------------'
axcheron
.---------------------------.
| !! NEW ACCOUNT DETECTED !!|
|---------------------------|
|~- Input your serial:    ~-|
'---------------------------'
6234472
Authenticated!
$ whoami
lab1end
$ cat /home/lab1end/.pass
1uCKy_Gue55
```

We're done with the challenges in **Lab01**. If you feel ready, you can continue with the **Lab02** which focus one the basics of [Stack Overflow](/writeups/mbe/lab2c/).
