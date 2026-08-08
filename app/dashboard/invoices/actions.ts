'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormDataSchema = z.object({
    id: z.number(),
    customerId: z.string({
        invalid_type_error: "Please select a customer"
    }),
    amount: z.coerce.number().gt(0, { message: "Please enter an amount greater than $0." }),
    status: z.enum(["pending", "paid"], {
        invalid_type_error: "Please select an invoice status."
    }),
    date: z.string()
})

const CreateInvoice = FormDataSchema.omit({ id: true, date: true })

export type State = {
    message?: string | null,
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    }
}

export async function createInvoice(_: State, formData: FormData): Promise<State> {
    try {
        const rawFormData = {
            customerId: formData.get('customerId'),
            amount: formData.get('amount'),
            status: formData.get('status'),
        }

        const validatedFields = CreateInvoice.safeParse(rawFormData);

        if (!validatedFields.success) {
            return {
                errors: validatedFields.error.flatten().fieldErrors,
                message: "Missing fields. Failed to Create Invoice"
            }
        }

        const { amount, customerId, status } = validatedFields.data

        const amountInCents = amount * 100;

        const date = new Date().toISOString().split('T')[0]

        await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
    } catch (e) {
        return {message: "Database error"}
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

const UpdateInvoice = FormDataSchema.omit({ id: true, date: true });

// ...

export async function updateInvoice(id: string, formData: FormData) {
    try {
        const { customerId, amount, status } = UpdateInvoice.parse({
            customerId: formData.get('customerId'),
            amount: formData.get('amount'),
            status: formData.get('status'),
        });

        const amountInCents = amount * 100;

        await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
    }
    catch (e) {
        console.error(e);
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await sql`
    DELETE FROM invoices
    WHERE id = ${id}
  `;
    } catch (e) {
        redirect('/dashboard/invoices');
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}