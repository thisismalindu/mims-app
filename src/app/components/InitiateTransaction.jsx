"use client";
import React, { useState } from "react";

export default function InitiateTransaction({changePage}) {

    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successData, setSuccessData] = useState(null);

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

            const result = await response.json();

            if (!response.ok) {
                setErrorMessage(result.error || 'Failed to initiate transaction');
                setShowErrorModal(true);
                return;
            }

            // Show success modal with transaction details
            setSuccessData(result);
            setShowSuccessModal(true);
            e.target.reset();
        } catch (error) {
            setErrorMessage('Network error: Unable to connect to server');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const closeErrorModal = () => {
        setShowErrorModal(false);
        setErrorMessage('');
    };

    const closeSuccessModal = () => {
        setShowSuccessModal(false);
        setSuccessData(null);
    };

    // Error Modal Component
    const ErrorModal = () => (
        showErrorModal && (
            <div className="fixed inset-0 bg-gray-100 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                <div className="relative mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Transaction Failed</h3>
                        <div className="mt-2 px-7 py-3">
                            <p className="text-sm text-gray-500">{errorMessage}</p>
                        </div>
                        <div className="items-center px-4 py-3">
                            <button
                                onClick={closeErrorModal}
                                className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    );

    // Success Modal Component
    const SuccessModal = () => (
        showSuccessModal && successData && (
            <div className="fixed inset-0 bg-gray-100 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                <div className="relative mx-auto p-5  w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Transaction Successful</h3>
                        <div className="mt-2 px-7 py-3">
                            <p className="text-sm text-gray-500 mb-2">{successData.message}</p>
                            <div className="text-sm text-left bg-gray-50 p-3 rounded-md">
                                <p><span className="font-medium">Transaction ID:</span> {successData.transaction.transaction_id}</p>
                                <p><span className="font-medium">New Balance:</span> Rs. {parseFloat(successData.new_balance).toFixed(2)}</p>
                                <p><span className="font-medium">Date:</span> {new Date(successData.transaction.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="items-center px-4 py-3">
                            <button
                                onClick={closeSuccessModal}
                                className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    );

    return (
        <div className=" px-6 py-12 lg:px-8">
            {/* Modals */}
            <ErrorModal />
            <SuccessModal />

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




