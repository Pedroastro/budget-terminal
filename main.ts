import { createInterface, type Interface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { DatabaseSync } from "node:sqlite";

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
 * Represents a category stored in the categories table.
 */
type Category = { id: number; name: string };

/**
 * Represents a financial entry from the entries table, either an income or an expense, with the name of its category.
 */
type Entry = { id: number; kind: string; amount: number; description: string; date: string; category: string };

/**
 * Validates that the amount is a positive number.
 */
function assertValidAmount(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError("Amount must be a positive number.");
    }
    return amount;
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
 * Represents a ledger that tracks financial entries and categories in a SQLite database.
 */
class Ledger {
    private readonly db: DatabaseSync;

    /** Opens the database file and creates the categories and entries tables if they don't exist yet. */
    constructor(fileName: string) {
        this.db = new DatabaseSync(fileName);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE COLLATE NOCASE,
                parent_id INTEGER REFERENCES categories(id)
            );
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY,
                kind TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT NOT NULL,
                date TEXT NOT NULL,
                category_id INTEGER NOT NULL REFERENCES categories(id)
            );
        `);
    }

    /**
     * Requires a category by name using a SELECT query (case insensitive). Throws a ValidationError if it isn't found.
     */
    requireCategory(name: string): Category {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            throw new ValidationError("Category name is required.");
        }
        const category = this.db.prepare("SELECT id, name FROM categories WHERE name = ?").get(trimmed) as Category | undefined;
        if (category === undefined) {
            throw new ValidationError(`Category '${trimmed}' does not exist.`);
        }
        return category;
    }

    /**
     * Asserts that a category name is available (not empty and not already used).
     */
    assertAvailableCategoryName(name: string): string {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            throw new ValidationError("Category name is required.");
        }
        if (this.db.prepare("SELECT id FROM categories WHERE name = ?").get(trimmed) !== undefined) {
            throw new ValidationError(`Category '${trimmed}' already exists.`);
        }
        return trimmed;
    }

    /**
     * Adds a new category to the database. If a parent category name is provided, the new category is added as a subcategory of the parent.
     */
    addCategory(name: string, parentName: string): string {
        const trimmed = this.assertAvailableCategoryName(name);
        const parentId = parentName.trim() === "" ? null : this.requireCategory(parentName).id;
        this.db.prepare("INSERT INTO categories (name, parent_id) VALUES (?, ?)").run(trimmed, parentId);
        return trimmed;
    }

    /**
     * Adds a new expense or income entry to the database while ensuring the category exists.
     */
    addEntry(kind: "expense" | "income", amount: number, description: string, date: string, categoryName: string): void {
        const category = this.requireCategory(categoryName);
        this.db.prepare("INSERT INTO entries (kind, amount, description, date, category_id) VALUES (?, ?, ?, ?, ?)")
            .run(kind, assertValidAmount(amount), assertValidDescription(description), date, category.id);
    }

    /**
     * Updates the amount and description of an entry in the database. Throws a ValidationError if it isn't found.
     */
    editEntry(id: number, amount: number, description: string): void {
        const result = this.db.prepare("UPDATE entries SET amount = ?, description = ? WHERE id = ?")
            .run(assertValidAmount(amount), assertValidDescription(description), id);
        if (result.changes === 0) {
            throw new ValidationError(`Entry ${id} does not exist.`);
        }
    }

    /**
     * Deletes an entry from the database. Throws a ValidationError if it isn't found.
     */
    deleteEntry(id: number): void {
        const result = this.db.prepare("DELETE FROM entries WHERE id = ?").run(id);
        if (result.changes === 0) {
            throw new ValidationError(`Entry ${id} does not exist.`);
        }
    }

    /**
     * Calculates the total amount for a given category, including its subcategories.
     */
    categoryTotal(categoryId: number): number {
        const own = this.db.prepare("SELECT SUM(CASE WHEN kind = 'income' THEN amount ELSE -amount END) AS total FROM entries WHERE category_id = ?")
            .get(categoryId) as { total: number | null };
        const children = this.db.prepare("SELECT id FROM categories WHERE parent_id = ?").all(categoryId) as { id: number }[];
        return children.reduce((total, child) => total + this.categoryTotal(child.id), own.total ?? 0);
    }

    /**
     * Returns the balance of the ledger by summing all entries.
     */
    balance(): number {
        const row = this.db.prepare("SELECT SUM(CASE WHEN kind = 'income' THEN amount ELSE -amount END) AS total FROM entries")
            .get() as { total: number | null };
        return row.total ?? 0;
    }

    /**
     * Returns true if the ledger has any entries. If it doesn't it returns false.
     */
    hasEntries(): boolean {
        const row = this.db.prepare("SELECT COUNT(*) AS count FROM entries").get() as { count: number };
        return row.count > 0;
    }

    /**
     * Returns all entries in the ledger, joined with the categories table to get the name of each category.
     */
    allEntries(): Entry[] {
        return this.db.prepare(`
            SELECT entries.id, entries.kind, entries.amount, entries.description, entries.date, categories.name AS category
            FROM entries
            JOIN categories ON entries.category_id = categories.id
            ORDER BY entries.id
        `).all() as Entry[];
    }
}

/**
 * Asks for a category name and an optional parent and adds it to the ledger.
 */
async function promptCategory(rl: Interface, ledger: Ledger): Promise<void> {
    const name = await rl.question("Category name: ");
    const parentName = await rl.question("Parent category (blank for none): ");
    const added = ledger.addCategory(name, parentName);
    console.log(`Added category '${added}'.`);
}

/**
 * Asks for the details of an expense or income and adds it to the ledger.
 */
async function promptEntry(rl: Interface, ledger: Ledger, kind: "expense" | "income"): Promise<void> {
    const amount = Number(await rl.question("Amount in dollars: "));
    const description = await rl.question("Description: ");
    const categoryName = await rl.question("Category: ");
    const today = new Date().toISOString().slice(0, 10);

    ledger.addEntry(kind, amount, description, today, categoryName);
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
    console.log(`${category.name} total: $${ledger.categoryTotal(category.id).toFixed(2)}`);
}

/**
 * Asks for an entry id and its new amount and description and updates it in the ledger.
 */
async function promptEditEntry(rl: Interface, ledger: Ledger): Promise<void> {
    const id = Number(await rl.question("Entry id: "));
    const amount = Number(await rl.question("New amount in dollars: "));
    const description = await rl.question("New description: ");
    ledger.editEntry(id, amount, description);
    console.log(`Updated entry ${id}.`);
}

/**
 * Asks for an entry id and deletes it from the ledger.
 */
async function promptDeleteEntry(rl: Interface, ledger: Ledger): Promise<void> {
    const id = Number(await rl.question("Entry id: "));
    ledger.deleteEntry(id);
    console.log(`Deleted entry ${id}.`);
}

/**
 * Prints every entry in the ledger.
 */
function printEntries(ledger: Ledger): void {
    if (!ledger.hasEntries()) {
        console.log("No entries yet.");
        return;
    }
    for (const entry of ledger.allEntries()) {
        console.log(`${entry.id}  ${entry.date}  ${entry.kind}  ${entry.category}  ${entry.description}  $${entry.amount.toFixed(2)}`);
    }
}

/**
 * Shows the menu and runs the chosen action until the user quits.
 */
async function main(): Promise<void> {
    const rl = createInterface({ input: stdin, output: stdout });
    const ledger = new Ledger("budget.db");

    while (true) {
        const choice = (await rl.question("\n1) Add category  2) Add expense  3) Add income  4) Balance  5) Category Total  6) List entries  7) Edit entry  8) Delete entry  9) Quit\n> ")).trim();
        if (choice === "9") {
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
            } else if (choice === "7") {
                await promptEditEntry(rl, ledger);
            } else if (choice === "8") {
                await promptDeleteEntry(rl, ledger);
            } else {
                console.log("Please choose 1-9.");
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
