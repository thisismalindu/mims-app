"use client";

export default function Customers() {
    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('Form data sent:', data);


        try {
            const response = await fetch('/api/create-customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Failed to create customer');
            }

            // Optionally handle success (e.g., clear form, show message)
            alert('Customer created successfully!');
            e.target.reset();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="card">
            <form className="customer-form" onSubmit={handleSubmit}>
                {
                    [
                        { label: "First Name", id: "firstname", name: "first_name", type: "text", required: true },
                        { label: "Last Name", id: "lastname", name: "last_name", type: "text", required: true },
                        { label: "NIC", id: "nic", name: "nic_number", type: "text", required: true },
                        { label: "Date of Birth", id: "dob", name: "date_of_birth", type: "date", required: true },
                        { label: "Address", id: "address", name: "address", type: "text", required: true },
                        { label: "Phone Number", id: "phonenumber", name: "phone_number", type: "tel", required: true },
                        { label: "Email", id: "email", name: "email", type: "email", required: true },
                        // { label: "", id: "agent", name: "created_by_agent_id", type: "hidden", value: "1" } // Replace "1" with actual agent ID
                    ]
                        .map(field => (
                            <div key={field.id}>
                                <label htmlFor={field.id}>{field.label}:</label>
                                {field.type === "select" ? (
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
                                        className="border border-gray-300 rounded-md p-1 w-full"
                                    />
                                )}
                            </div>
                        ))
                }

                <button type="submit" className="bg-cyan-600 text-white pt-2 pb-2 pr-4 pl-4 rounded-2xl cursor-pointer hover:opacity-80" >Add Customer</button>
            </form>
        </div>
    );
}
