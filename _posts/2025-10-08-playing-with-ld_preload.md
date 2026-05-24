---
title: "Работа с LD_PRELOAD"
excerpt: "Введение в переменную окружения LD_PRELOAD."
tags:
  - utumno
  - linux
  - rce
---

---
**LD_PRELOAD** is an environment variable that can be set to load ELF *shared objects* before all others. It means that, if your executable is dynamically linked, you can load a library to **override** (or *replace*) any functions or symbols preloaded from other libraries. Basically, you can implement **your** version of *printf()*.

This feature is often used as a *"quick fix"* to patch a library while working on a more stable solution. However, this feature can also be used to create **rootkits**, **reverse code** or **bypass anti-debugging** techniques.

# Введение в динамическую линковку

Back in the days, lots of executable were statically linked. Entire libraries were linked and compiled in an executable. One of the advantages was to make sure that all the libraries were present to properly run the executable and avoids dependency problems. However, the size of the executables became significantly greater and in case of a library update, you need to change the whole executable.

Nowadays, we mostly use dynamic linking.  It means that the **shared** libraries are linked at runtime. When the programs is executed and thus, loaded in memory, the dynamic linker loads and links the libraries that are needed to properly run the executable.

# Статическая и динамическая линковка

Let's take a simple piece of code:

```c
#include <stdio.h>

void main() {
	printf("Hello World !\n");
}
```

In this code, the **stdio.h** header defines variable *types*, several *macros*, and various *functions* for performing input and output. This file contains the declaration of *printf()* and is a part of the **C standard library** or **libc** on Linux systems.

Now, let's link it dynamically :

```bash
gcc demo.c -o demo_dyn
```

By **default**, *gcc* will dynamically link it. You can check that fact by running the following command:

```bash
$ readelf -h demo_dyn
ELF Header:
  Magic:   7f 45 4c 46 01 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF32
  Data:                              2\'s complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              DYN (Shared object file)
[... removed ...]
```

The file **Type** is **DYN** (or *dynamically linked*). You can also check the dynamic library imported at execution by using the following command :

```bash
$ ldd demo_dyn
	linux-gate.so.1 (0xb7f49000)
	libc.so.6 => /lib/i386-linux-gnu/libc.so.6 (0xb7d5c000)
	/lib/ld-linux.so.2 (0xb7f4b000)
```

Also, we can see the *openat()* call while doing an *strace()* on the executable :

```bash
$ strace ./demo_dyn
execve("./demo_dyn", ["./demo_dyn"], 0xbfd19880 /* 21 vars */) = 0
brk(NULL)                               = 0x950000
access("/etc/ld.so.nohwcap", F_OK)      = -1 ENOENT (No such file or directory)
mmap2(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0xb7fb0000
access("/etc/ld.so.preload", R_OK)      = -1 ENOENT (No such file or directory)
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_LARGEFILE|O_CLOEXEC) = 3
fstat64(3, {st_mode=S_IFREG|0644, st_size=19114, ...}) = 0
mmap2(NULL, 19114, PROT_READ, MAP_PRIVATE, 3, 0) = 0xb7fab000
close(3)                                = 0
access("/etc/ld.so.nohwcap", F_OK)      = -1 ENOENT (No such file or directory)
openat(AT_FDCWD, "/lib/i386-linux-gnu/libc.so.6", O_RDONLY|O_LARGEFILE|O_CLOEXEC) = 3
read(3, "\177ELF\1\1\1\3\0\0\0\0\0\0\0\0\3\0\3\0\1\0\0\0\300\254\1\0004\0\0\0"..., 512) = 512
```

You can see the `openat(AT_FDCWD, "/lib/i386-linux-gnu/libc.so.6", O_RDONLY|O_LARGEFILE|O_CLOEXEC)` line calling the *libc*. You can also see the `access("/etc/ld.so.preload", R_OK)      = -1 ENOENT (No such file or directory)` before, it means that the **LD_PRELOAD** environment variable have precedence over any other libraries loaded for the executable. Here, we don't have any **LD_PRELOAD** environment variable so, it doesn't matter.

**Заметка:** There are **various** methods of specifying libraries to be pre‐loaded, and these are handled in the following order : The **LD_PRELOAD** environment variable, the **--preload** command-line option when invoking the dynamic linker directly and the **/etc/ld.so.preload** file.
{: .notice--info}

Now, we can try to statically link it :
```bash
$ gcc -static demo.c -o demo_stc
```

If you try the **ldd** command on it, it won't return anything, because the library resides inside the executable :

```bash
$ ldd demo_stc
	not a dynamic executable
```

If you check the file **Type** it should be  **EXEC** as it is a standard executable program without any shared libraries :

```bash
$ readelf -h demo_stc
ELF Header:
  Magic:   7f 45 4c 46 01 01 01 03 00 00 00 00 00 00 00 00
  Class:                             ELF32
  Data:                              2\'s complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - GNU
  ABI Version:                       0
  Type:                              EXEC (Executable file)
[... removed ...]
```

Even the *strace()* call don't show any call to an external library :

```bash
$ strace ./demo_stc
execve("./demo_stc", ["./demo_stc"], 0xbfe313c0 /* 21 vars */) = 0
brk(NULL)                               = 0x8c86000
brk(0x8c86d40)                          = 0x8c86d40
set_thread_area({entry_number=-1, base_addr=0x8c86840, limit=0x0fffff, seg_32bit=1, contents=0, read_exec_only=0, limit_in_pages=1, seg_not_present=0, useable=1}) = 0 (entry_number=6)
uname({sysname="Linux", nodename="debian", ...}) = 0
readlink("/proc/self/exe", "/home/user/demo_stc", 4096) = 19
brk(0x8ca7d40)                          = 0x8ca7d40
brk(0x8ca8000)                          = 0x8ca8000
access("/etc/ld.so.nohwcap", F_OK)      = -1 ENOENT (No such file or directory)
fstat64(1, {st_mode=S_IFCHR|0620, st_rdev=makedev(0x88, 0x1), ...}) = 0
write(1, "Hello World !\n", 14Hello World !
)         = 14
exit_group(14)                          = ?
+++ exited with 14 +++
```

Now that you have some basics, we can move on to the next steps.

# Hooking функции

Let's try to hook the *puts()* function of the following code:

```c
#include <stdio.h>
// gcc demo.c -o demo

void main() {
	puts("Hello World !");
}
```

This code will print the famous **"Hello World !"** message. However, you prefer *unicorns*. So you would like to make sure that this program is saying **"I love Unicorns"**. Using **LD_PRELOAD**, you can write a library to change this message by overriding the original *puts()* function. First we need to write a shared object, it's quite simple :

```c
#include <stdio.h>

int puts(const char *str) {
  printf("I love Unicorns");

  return 0;
}
```

The previous code is just **your** implementation of the **puts()** function. As you can see, it takes the same return *type* and *parameters*. Then, you compile it as a shared library :

```bash
$ gcc preload.c -o preload.so -fPIC -shared -ldl
```

Finally, you run the executable with the **LD_PRELOAD** pointing to your newly created library.

```bash
# До
$ ./demo
Hello World !

# После
$ LD_PRELOAD="./preload.so" ./demo
I love Unicorns
```

Easy ! Let's move to something a bit more advanced.

# Решение простого CrackMe

Let's say we have a (really) simple **CrackMe**, like the following one :

```c
#include <stdio.h>
#include <string.h>
// gcc crackme.c -o crackme
void main() {
	char pass[15];

	printf("Password: ");
	fgets(pass, 15, stdin);
	pass[strcspn(pass, "\r\n")] = 0;
	if (!strcmp("foobar", pass)) {
		printf("Yay !");
	}
	else {
		printf("Nope !");
	}
}
```

Here is an example :

```bash
$ ./crackme
Password: test
Nope !
$ ./crackme
Password: foobar
Yay !
```

Here, the trick is quite simple (and is used in many *crackmes*), we just do a simple password comparison with *strcmp()*.

Now, let's say, we are too lazy to start **GDB** but we know how to use **LD_PRELOAD**, we could hook the *strcmp()* function and display the content of the compared variables. However, we want to make sure that *strcmp()* still return the right result, so we must make sure that we get the result from the original *strcmp()* function.

Why ? Well, here it's mainly to show you how to do it but, in more complex use case you could break the executable flow if you don't do it properly. Here is my solution :

```c
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>

// Define an alternative name for strcmp()
int (*orig_strcmp)(const char *str1, const char *str2);

int strcmp(const char *str1, const char *str2) {

  // Backup the orginal call to strcmp() in orig_strcmp()
  // by initialazing the pointer of orig_strcmp().
  if(!orig_strcmp) orig_strcmp = dlsym(RTLD_NEXT, "strcmp");

  printf("You should try '%s'\n", str1);

  // return the proper result of strcmp()
  return orig_strcmp(str1,str2);
}
```

Note the *dlfcn.h* header which is used to call the *dlsym()* function. This function is used to keep track of the original implementation of *strcmp()*. By calling `dlsym(RTLD_NEXT, "strcmp")` with the *RTLD_NEXT* flag, the function will return a pointer to the next version of *strcmp()* which is the original version of *strcmp()* in **libc**.

This is due to the fact that our library will be loaded with **LD_PRELOAD**, which mean **before** the orginal **libc** (or any other library for that matter).

I also added **_GNU_SOURCE** preprocessor directive to avoid an issue with the *RTLD_NEXT* flag which is not defined by the *POSIX* standard.

**Заметка:** If you don't want to use `#define _GNU_SOURCE` in your source code, you can also use the **-D_GNU_SOURCE** switch with **gcc**.
{: .notice--info}

Then, I return the orignal result of *strcmp()* using the pointer to **libc**.

```bash
$ gcc preload_crackme.c -o preload_crackme.so -fPIC -shared -ldl
$ LD_PRELOAD="./preload_crackme.so" ./crackme
Password: test
You should try 'foobar'
Nope !
```

As you can see, we get our *hint* then, the executable still return **"Nope !"** as the password is incorrect. Another solution would have been to simply specify a `return 0;` in our implementation and we would have the **"Yay !"** message.

# Обход anti-debugging

There is a simple technique to detect if a process is currently running in a debugger, the **PTRACE_TRACEME** request. This method is based on the *ptrace()* system call which is used to **observe and control** the execution of another process (e.g. **GDB** use *ptrace*).

However, there is a request within *ptrace()*, **PTRACE_TRACEME**, which allow an executable to trace himself (in fact it indicate that this process is to be traced by its parent). By implementing this *syscall* in a program, the call to *ptrace()* will generate an error (on error, all requests **return -1**) if the process is running with a debugger.

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/ptrace.h>

void main() {
  if (ptrace(PTRACE_TRACEME, 0, 0, 0) < 0) {
    printf("I can see you GDB !\n");
    exit(1);
  }
  else {
    printf("No debugger detected !\n");
  }
}
```

Here, the process try to trace himself, if there is no error we won't get any error. However, if this process is attached in a debugger, *ptrace()* will return a error and exit.

```bash
$ ./debugme
No debugger detected !
$ gdb -q ./debugme
Reading symbols from ./debugme...(no debugging symbols found)...done.
(gdb) run
Starting program: /home/user/debugme
I can see you GDB !
[Inferior 1 (process 7790) exited with code 01]
```

But, we could build a shared library to be loaded with **GDB** to reimplement the *ptrace()* call and bypass the anti-debug trick.

```c
#include <sys/types.h>
//gcc preload_debugme.c -o preload_debugme.so -fPIC -shared -ldl

long ptrace(int request, pid_t pid, void *addr, void *data) {
  return 0;
}
```

Then, you can load this library direclty in **GDB** and check the result :

```bash
gdb -q ./debugme
Reading symbols from ./debugme...(no debugging symbols found)...done.
(gdb) set environment LD_PRELOAD ./preload_debugme.so
(gdb) run
Starting program: /home/user/debugme
No debugger detected !
[Inferior 1 (process 7894) exited with code 027]
```

Easy, right ?! Let's do one last exercise.

# Решение Utumno0 на OTW (OverTheWire)

Now, we will apply our skills on a live target. I have to admit that I wrote this post after solving the [Utumno](overthewire.org/wargames/utumno/) level 0 challenge on [OverTheWire](http://overthewire.org/wargames/).

First, we need to login on the wargame machine with the following credentials :

**SSH :** *ssh utumno0@utumno.labs.overthewire.org -p 2227*<br/>
**Pass :** *utumno0*

Let's go to the challenges directory and run the target program.

```bash
utumno0@utumno:~$ cd /utumno/
utumno0@utumno:/utumno$ ./utumno0
Read me! :P
utumno0@utumno:/utumno$ file ./utumno0
./utumno0: executable, regular file, no read permission
```

No read permission, meaning no `gdb`, `objdump` or whatsoever but, there is an output message saying **"Read me! :P"**. While we don't really care about the message, it also means that there is some kind of function called to display this message. So, we could code a library to hook this function with **LD_PRELOAD** and explore the code from here.

However, we don't really know which function is used to display the message. But it's not really an issue, I'll start with *puts()*.

**Заметка:** I created a directory in `/tmp` to create and compile my library.
{: .notice--info}

```c
#include <stdio.h>
// gcc preload.c -o preload.so -fPIC -shared -ldl -m32
int puts ( const char * str ) {
	printf("Hello from 'puts' !");

	return 0;
}
```

Then, we test the code :

```bash
utumno0@utumno:/tmp/axc$ LD_PRELOAD="./preload.so" /utumno/utumno0
Hello from 'puts' !
```

So, it seems that the program is using *puts()* to print the message. Now, we could use *printf()* to read data on the **stack** by employing the same method used by the [Format String](https://axcheron.github.io/exploit-101-format-strings/) vulnerability.

```c
#include <stdio.h>

int puts ( const char * str ) {
	printf("%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x.%08x\n");

	return 0;
}
```

The *%08x* string is interpreted by the *printf()* as specifiers resulting in reading data from the stack because there are no variables specified. So, for each **%08x**, *printf()* will fetch a number from the stack, treat this number as an address, and print out the memory contents pointed by this address as a string. Here is the result :

```bash
utumno0@utumno:/tmp/axc$ LD_PRELOAD="./preload.so" /utumno/utumno0
f7fee710.ffffd6e4.f7fcf52c.f7fc3dbc.00000000.ffffd6b8.08048402.080484a5.08048490.00000000
```

So, why did we do that ? Well, as it's a *wargame*, the password is probably somewhere in memory, but we can't **read** this executable so, we need to be creative. Here, I see 3 interesting addresses :

- `08048402`
- `080484a5`
- `08048490`

These addresses are not *NULL* or somewhere in the *Kernel address space*. They start with `0x0804` which means that the process can read, write and execute things on these memory areas. So, if we are lucky, maybe one of them is pointing on an interesting string. Let's check that assumption :

```c
#include <stdio.h>

int puts ( const char * str ) {
	printf("%s\n", 0x08048402);
	printf("%s\n", 0x080484a5);
	printf("%s\n", 0x08048490);

	return 0;
}
```

This code will interpret each addresses as a string pointer and print out the content. Now, we compile and execute.


```bash
utumno0@utumno:/tmp/axc$ LD_PRELOAD="./preload.so" /utumno/utumno0
���
Read me! :P
password: [..removed..]
```

Awesome! We got the password (well, I got the password)!

# Заключение

This was a quick introduction to the **LD_PRELOAD** variable but, you should have the basics. It can be really useful with dynamically linked executable to analyse, reverse, exploit or modify code without any alteration on the original program. Sky is the limit, enjoy !
