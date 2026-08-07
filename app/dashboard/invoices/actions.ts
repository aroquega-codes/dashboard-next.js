'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormDataSchema = z.object({
    id: z.number(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.string(),
    date: z.string()
})

const CreateInvoice = FormDataSchema.omit({ id: true, date: true })

export async function createInvoice(formData: FormData) {
    try {
        const rawFormData = {
            customerId: formData.get('customerId'),
            amount: formData.get('amount'),
            status: formData.get('status'),
        }

        const { customerId, amount, status } = CreateInvoice.parse(rawFormData);
        const amountInCents = amount * 100;

        const date = new Date().toISOString().split('T')[0]

        await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
    } catch (e) {
        console.error(e);
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