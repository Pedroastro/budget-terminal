# Overview

I built budget terminal to gain more knowledge of Typescript and to be better qualified to understand how to display output to the terminal, recursion, classes, lists, asynchronous functions and throw/handle exceptions.

Budget terminal is a terminal based tool that lets a user record income, expenses and organize them into categories and subcategories. It also allows the user to grab a list of entries, see the total for a category and grab the balance fo the whole ledger.

The purpose of it was to help me better understand basic principles of Typescript and how they apply to real life.

[Software Demo Video](https://www.youtube.com/watch?v=eRIk6fkNljQ)

# Development Environment

In this project I used these tools: Visual Studio Code, Node.js and npx.

The programming language I used was TypeScript. I also used Node.js's standard library modules for terminal prompts (node:readline/promises) and input/output (node:process). The only thing needed to run the program is Node.js (run it with npx tsx main.ts).

# Useful Websites

- [typescriptlang.org classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [typescriptlang.org everyday types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [nodejs.org Readline Promises API](https://nodejs.org/api/readline.html#promises-api)
- [nodejs.org Console](https://nodejs.org/api/console.html)
- [nodejs.org Running TypeScript with a runner (tsx)](https://nodejs.org/en/learn/typescript/run)
- [developer.mozilla.org async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [developer.mozilla.org try...catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
- [developer.mozilla.org Error (custom error types)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types)
- [developer.mozilla.org Functions (recursion)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#recursion)
- [developer.mozilla.org Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)

# Future Work

- Adding a way to edit existing entries and categories after they are created.
- Saving the ledger to a file (so the user can close the terminal without loosing the data).
- Adding date range reports, such as monthly income, expenses, and balance.