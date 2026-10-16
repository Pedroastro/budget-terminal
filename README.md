# Overview

I updated budget terminal to gain more knowledge of SQL relational databases and to be better qualified to understand how a program can create a database and its tables, insert, modify, delete and retrieve data and join two tables together.

Budget terminal is a terminal based tool that lets a user record income, expenses and organize them into categories and subcategories. It also allows the user to grab a list of entries, see the total for a category, grab the balance of the whole ledger and edit or delete entries. Everything is saved in a SQLite database, so the data is still there after the user closes the terminal.

To use it, run `node main.ts` inside the project folder and type the number of an option from the menu: add a category, add an expense, add an income, see the balance, see the total for a category, list the entries, edit an entry, delete an entry or quit. The list of entries shows the id of each entry, which is what the user types to edit or delete it.

The purpose of it was to help me better understand how SQL works and how a program uses a relational database to save its data, while also adding two things I had listed as future work in the first version of budget terminal: saving the data and editing entries.

[Software Demo Video](https://www.youtube.com/watch?v=vQvTHcUA5TY)

# Relational Database

I used SQLite through the SQLite module that comes with Node.js. When the program runs it creates budget.db which is a single file with the relational database (if the file had not been created before).

The database has two tables:

- categories: stores the id, name and parent_id of each category. The parent_id is NULL for main categories, and for subcategories it has the id of their parent category, which is another row of the same table.
- entries: stores the id, kind (income or expense), amount, description, date and category_id of each entry. The category_id has the id of the entry's category in the categories table.

To show the list of entries with the name of their category, the program joins the entries table with the categories table.

# Development Environment

In this project I used these tools: Visual Studio Code and Node.js.

The programming language I used was TypeScript. I also used Node.js's standard library modules for the SQLite database (node:sqlite), terminal prompts (node:readline/promises) and input/output (node:process). The only thing needed to run the program is Node.js (run it with `node main.ts` inside the project folder).

# Useful Websites

- [nodejs.org SQLite](https://nodejs.org/api/sqlite.html)
- [sqlite.org CREATE TABLE](https://www.sqlite.org/lang_createtable.html)
- [sqlite.org INSERT](https://www.sqlite.org/lang_insert.html)
- [sqlite.org UPDATE](https://www.sqlite.org/lang_update.html)
- [sqlite.org DELETE](https://www.sqlite.org/lang_delete.html)
- [sqlite.org SELECT](https://www.sqlite.org/lang_select.html)
- [sqlite.org Foreign Key Support](https://www.sqlite.org/foreignkeys.html)

# Future Work

- Adding a way to edit and delete categories
- Letting the user choose the date of an entry instead of always using today's date.
- Adding date range reports, such as monthly income, expenses and balance.