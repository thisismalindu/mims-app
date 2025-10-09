"use client";
import React, { useState } from "react";

export default function InitiateTransaction({changePage}) {

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('Form data sent:', data);


        try {
            const response = await fetch('/api/initiate-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Failed to initiate transaction');
            }

            // Optionally handle success (e.g., clear form, show message)
            alert('Transaction initiated successfully!');
            e.target.reset();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false); // re-enable button after response
        }
    };

    return (
        <div className=" px-6 py-12 lg:px-8">

            <a onClick={() => changePage("Dashboard")}  className='rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600'>
            ⬅ back
            </a>


            <h2 className="mt-10 text-gray-900 text-2xl/9 font-bold tracking-tight ">
                Initiate Transaction
            </h2>
            
            <form className="w=full max-w-3xl mt-10 " onSubmit={handleSubmit}>
                {
                    [
                        { label: "Account Number", id: "account", name: "account_number", type: "text", required: true },
                        { label: "Amount", id: "amount", name: "amount", type: "number", required: true },
                        { label: "Transaction Type", id: "type", name: "transaction_type", type: "radio", options: [
                            { label: "Deposit", value: "deposit" },
                            { label: "Withdraw", value: "withdraw" }
                        ], required: true },
                        { label: "Description", id: "description", name: "description", type: "text", required: false },
                    ]
                        .map(field => (
                            <div key={field.id} className='flex  flex-col mb-4'>
                                <div className="flex items-center">
                                    <label className="text-sm/6 font-medium text-gray-400" htmlFor={field.id}>{field.label}:</label>
                                    {field.required ? <p className="text-red-500 font-medium">*</p> : <></>}
                                </div>
                                {field.type === "radio" ? (
                                    <div className="flex gap-4 mt-2" role="radiogroup" aria-labelledby={field.id}>
                                        {field.options.map(opt => (
                                            <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    id={`${field.id}-${opt.value}`}
                                                    name={field.name}
                                                    value={opt.value}
                                                    required={field.required}
                                                    defaultChecked={opt.value === "deposit"}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : field.type === "select" ? (
                                    <select id={field.id} name={field.name} required={field.required}>
                                        {field.options.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        id={field.id}
                                        name={field.name}
                                        required={field.required}
                                        className=" rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
                                    />
                                )}
                            </div>
                        ))
                }

                <div>
                    <p className="text-sm/6 my-4 italic text-red-500">* Required fields</p>
                </div>

                <button 
                type="submit" 
                disabled={loading}
                className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"
                                } cursor-pointer`} >
                            {loading ? "Initiating Transaction..." : "Initiate Transaction"}</button>
            </form>
        </div>
    );
}




