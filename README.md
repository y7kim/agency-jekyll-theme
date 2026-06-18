Agency Jekyll theme
====================

Agency theme based on [Agency bootstrap theme ](https://startbootstrap.com/template-overviews/agency/)

# How to use

###Portfolio 

Portfolio projects are in '/_posts'

Images are in '/img/portfolio'

###About

Images are in '/img/about/'

###Team

Team members and info are in '_config.yml'

Images are in '/img/team/'


# Demo

View this jekyll theme in action [here](https://y7kim.github.io/agency-jekyll-theme)

=========
For more details, read [documentation](http://jekyllrb.com/)

=========
文档结构
project-root/
├── _data/
├── _includes/
├── _layouts/
├── _posts/
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   ├── img/
│       └── logo.png
├── _config.yml
├── index.html
└── README.md

===========
新文档结构（2月6日）
/
│── index.html            # 首页（不再展示博客文章）
│── products.html         # 产品分类页面
│── services.html         # 服务分类页面
│── blog.html             # 博客分类页面（所有文章在这里显示）
│── _posts/               # Markdown 文章（自动生成博客）
│── _layouts/
│   ├── default.html      # 默认模板
│   ├── category.html     # 分类页模板（用于 /blog/ /products/ 等）
│   ├── post.html         # 文章详情模板（用于单篇博客）
│── _includes/
│   ├── header.html       # 全局导航
│   ├── footer.html       # 页脚
│── css/
│   ├── agency.css        # 主要样式

