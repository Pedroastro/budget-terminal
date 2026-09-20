import { createInterface, type Interface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

/**
 * An error handling class for validation errors.
 */
class ValidationError extends Error {
  /** Create a validation error with a message. */
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Represents a budget category with a name and subcategories.
 */
class Category {
    private readonly subcategories: Category[] = [];
    
    /** Creates a new category with the given name. */
    constructor(readonly name: string) {}

    /**
     * Returns the subcategories of this category.
     */
    get children(): readonly Category[] {
        return this.subcategories;
    }

    /**
     * Adds a subcategory to this category.
     */
    addSubcategory(subcategory: Category): void {
        this.subcategories.push(subcategory);
    }
}

/**
 * Wraps the recursive case insensitive name search for a category.
 */
function findCategory(nodes: readonly Category[], name: string): Category | undefined {
    // Normalizes the name to lowercase, trims and finds the category recursively.
    return findByLoweredName(nodes, name.trim().toLowerCase());
}

/**
 * Recursively searches for a category by its name ignoring case.
 */
function findByLoweredName(nodes: readonly Category[], loweredName: string): Category | undefined {
    for (const node of nodes) {
        if (node.name.toLowerCase() === loweredName) {
            return node;
        }
        const found = findByLoweredName(node.children, loweredName);
        if (found !== undefined) {
            return found;
        }
    }
    return undefined;
}

/**
 * Represents a financial entry, either an income or an expense.
 */
abstract class Entry {
    readonly amount: number;
    readonly description: string;
    readonly date: string;
    readonly categoryName: string;

    /** Builds a valid Entry with a positive amount, description, date, and category. */
    constructor(amount: number, description: string, date: string, categoryName: string) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new ValidationError("Amount must be a positive number.");
        }
        this.amount = amount;
        this.description = assertValidDescription(description);
        this.date = date;
        this.categoryName = categoryName;
    }

    /**
     * The signed value of the entry amount. Income adds to the Balance, Expense subtracts and the Ledger sums these to get the Balance.
     */
    abstract signedAmount(): number;
}

/**
 * Validates that the description is not empty or whitespace.
 */
function assertValidDescription(input: string): string {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
        throw new ValidationError("Description is required.");
    }
    return trimmed;
}

/**
 * Represents an expense entry.
 */
class Expense extends Entry {

    /** Returns this Expense as a negative amount for totals. */
    signedAmount(): number {
        return -this.amount;
    }
}

/**
 * Represents an income entry.
 */
class Income extends Entry {
    /** Returns this Income as a positive amount for totals. */
    signedAmount(): number {
        return this.amount;
    }
}

/**
 * Represents a ledger that tracks financial entries and categories.
 */
class Ledger {
    private readonly entries: Entry[] = [];
    private readonly categories: Category[] = [];

    /**
     * Uses the findCategory function to find a category by name (recursively and case insensitive).
     */
    private findCategoryByName(name: string): Category | undefined {
        return findCategory(this.categories, name);
    }

    /**
     * Requires a category by name using findCategoryByName. Throws a ValidationError if it isn't found.
     */
    requireCategory(name: string): Category {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            throw new ValidationError("Category name is required.");
        }
        const found = this.findCategoryByName(trimmed);
        if (found === undefined) {
            throw new ValidationError(`Category '${trimmed}' does not exist.`);
        }
        return found;
    }

    /**
     * Asserts that a category name is available (not empty and not already used).
     */
    assertAvailableCategoryName(name: string): string {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            throw new ValidationError("Category name is required.");
        }
        if (this.findCategoryByName(trimmed) !== undefined) {
            throw new ValidationError(`Category '${trimmed}' already exists.`);
        }
        return trimmed;
    }

    /**
     * Adds a new category to the ledger. If a parent category name is provided, the new category is added as a subcategory of the parent.
     */
    addCategory(name: string, parentName?: string): Category {
        const category = new Category(this.assertAvailableCategoryName(name));
        if (parentName === undefined || parentName.trim() === "") {
            this.categories.push(category);
        } else {
            this.requireCategory(parentName).addSubcategory(category);
        }
        return category;
    }

    /** 
     * Adds a new expense entry to the ledger while ensuring the category exists. 
     */
    addExpense(amount: number, description: string, date: string, categoryName: string): void {
        const category = this.requireCategory(categoryName);
        const expense = new Expense(amount, description, date, category.name);
        this.entries.push(expense);
    }

    /** 
     * Adds a new income entry to the ledger while ensuring the category exists. 
     */
    addIncome(amount: number, description: string, date: string, categoryName: string): void {
        const category = this.requireCategory(categoryName);
        const income = new Income(amount, description, date, category.name);
        this.entries.push(income);
    }

    /**
     * Calculates the total amount for a given category, including its subcategories.
     */
    categoryTotal(category: Category): number {
        const ownTotal = this.entries.filter(entry => entry.categoryName === category.name).reduce((total, entry) => total + entry.signedAmount(), 0);
        return category.children.reduce((total, child) => total + this.categoryTotal(child), ownTotal);
    }

    /**
     * Returns the balance of the ledger by summing all entries.
     */
    balance(): number {
        return this.entries.reduce((total, entry) => total + entry.signedAmount(), 0);
    }

    /**
     * Returns true if the ledger has any entries. If it doesn't it returns false.
     */
    hasEntries(): boolean {
        return this.entries.length > 0;
    }

    /**
     * Returns all entries in the ledger.
     */
    get allEntries(): readonly Entry[] {
        return this.entries;
    }
}

/**
 * Asks for a category name and an optional parent and adds it to the ledger.
 */
async function promptCategory(rl: Interface, ledger: Ledger): Promise<void> {
    const name = await rl.question("Category name: ");
    const parentName = await rl.question("Parent category (blank for none): ");
    const category = ledger.addCategory(name, parentName);
    console.log(`Added category '${category.name}'.`);
}

/**
 * Asks for the details of an expense or income and adds it to the ledger.
 */
async function promptEntry(rl: Interface, ledger: Ledger, kind: "expense" | "income"): Promise<void> {
    const amount = Number(await rl.question("Amount in dollars: "));
    const description = await rl.question("Description: ");
    const categoryName = await rl.question("Category: ");
    const today = new Date().toISOString().slice(0, 10);

    if (kind === "expense") {
        ledger.addExpense(amount, description, today, categoryName);
    } else {
        ledger.addIncome(amount, description, today, categoryName);
    }
    console.log(`Balance: $${ledger.balance().toFixed(2)}`);
}

/**
 * Asks for a category and prints its total, including its subcategories.
 */
async function promptCategoryTotal(rl: Interface, ledger: Ledger): Promise<void> {
    if (!ledger.hasEntries()) {
        console.log("No entries yet.");
        return;
    }
    const category = ledger.requireCategory(await rl.question("Category: "));
    console.log(`${category.name} total: $${ledger.categoryTotal(category).toFixed(2)}`);
}

/**
 * Prints every entry in the ledger.
 */
function printEntries(ledger: Ledger): void {
    if (!ledger.hasEntries()) {
        console.log("No entries yet.");
        return;
    }
    for (const entry of ledger.allEntries) {
        console.log(`${entry.date}  ${entry.categoryName}  ${entry.description}  $${entry.signedAmount().toFixed(2)}`);
    }
}

/**
 * Shows the menu and runs the chosen action until the user quits.
 */
async function main(): Promise<void> {
    const rl = createInterface({ input: stdin, output: stdout });
    const ledger = new Ledger();

    while (true) {
        const choice = (await rl.question("\n1) Add category  2) Add expense  3) Add income  4) Balance  5) Category Total  6) List entries  7) Quit\n> ")).trim();
        if (choice === "7") {
            break;
        }
        try {
            if (choice === "1") {
                await promptCategory(rl, ledger);
            } else if (choice === "2") {
                await promptEntry(rl, ledger, "expense");
            } else if (choice === "3") {
                await promptEntry(rl, ledger, "income");
            } else if (choice === "4") {
                console.log(`Balance: $${ledger.balance().toFixed(2)}`);
            } else if (choice === "5") {
                await promptCategoryTotal(rl, ledger);
            } else if (choice === "6") {
                printEntries(ledger);
            } else {
                console.log("Please choose 1-7.");
            }
        } catch (error) {
            if (!(error instanceof ValidationError)) {
                throw error;
            }
            console.log(error.message);
        }
    }
    rl.close();
}

main();