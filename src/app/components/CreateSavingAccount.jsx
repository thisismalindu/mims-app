"use client";
import React, { useState, useEffect, useCallback } from "react";

export default function CreateSavingAccount({ changePage }) {
  const [loading, setLoading] = useState(false);
  const [ownershipType, setOwnershipType] = useState("primary");
  const [accountPlans, setAccountPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [plansError, setPlansError] = useState('');  // New: Track fetch errors
  const [primaryCustomer, setPrimaryCustomer] = useState({ name: '', age: null, error: '' });
  const [jointCustomer, setJointCustomer] = useState({ name: '', age: null, error: '' });
  const [customerId, setCustomerId] = useState('');
  const [jointCustomerId, setJointCustomerId] = useState('');
  const [agentBranch, setAgentBranch] = useState({ id: null, name: '', loading: true });  // Add loading
  const [fetchTimeout, setFetchTimeout] = useState(null);

  // Fetch account plans from backend
  useEffect(() => {
    const fetchAccountPlans = async () => {
      try {
        const res = await fetch("/api/get-account-plans");
        if (!res.ok) throw new Error("Failed to fetch account plans");
        const data = await res.json();
        console.log("[CreateSavingAccount] Plans fetched:", data.plans?.length || 0);  // Debug
        setAccountPlans(data.plans || []);
        setPlansError('');
      } catch (err) {
        console.error("Error loading account plans:", err);
        setPlansError('Failed to load plans - check console');
      }
    };

    fetchAccountPlans();
  }, []);

  // Fetch agent's branch on mount
  useEffect(() => {
    const fetchAgentBranch = async () => {
      try {
        setAgentBranch(prev => ({ ...prev, loading: true }));
        const res = await fetch("/api/current-user");
        console.log("[CreateSavingAccount] Current-user response status:", res.status);  // Debug
        if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
        const data = await res.json();
        console.log("[CreateSavingAccount] Current-user data:", data);  // Debug
        if (data.success && data.user.branch) {
          setAgentBranch({ 
            id: data.user.branch.branch_id, 
            name: data.user.branch.branch_name, 
            loading: false 
          });
        } else {
          console.warn("[CreateSavingAccount] No branch in response");
          setAgentBranch({ id: null, name: 'No branch assigned - update DB', loading: false });
        }
      } catch (err) {
        console.error("Error fetching agent branch:", err);
        setAgentBranch({ id: null, name: 'Error loading branch', loading: false });
      }
    };

    fetchAgentBranch();
  }, []);

  // Debounced fetch customer details (unchanged)
  const fetchCustomer = useCallback(async (id, setter) => {
    if (!id || id.trim() === '') {
      setter({ name: '', age: null, error: '' });
      return;
    }

    try {
      const res = await fetch(`/api/get-customer-details?customer_id=${id.trim()}`);
      const data = await res.json();
      if (data.success) {
        const dob = data.customer.date_of_birth;
        const today = new Date('2025-10-20');
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        setter({ name: `${data.customer.first_name} ${data.customer.last_name}`, age, error: '' });
      } else {
        setter({ name: '', age: null, error: data.error || 'Customer not found' });
      }
    } catch (err) {
      console.error("Error fetching customer:", err);
      setter({ name: '', age: null, error: 'Error fetching customer' });
    }
  }, []);

  const handlePrimaryCustomerChange = (e) => {
    const id = e.target.value;
    setCustomerId(id);
    if (fetchTimeout) clearTimeout(fetchTimeout);
    const timeout = setTimeout(() => fetchCustomer(id, setPrimaryCustomer), 500);
    setFetchTimeout(timeout);
  };

  const handleJointCustomerChange = (e) => {
    const id = e.target.value;
    setJointCustomerId(id);
    if (fetchTimeout) clearTimeout(fetchTimeout);
    const timeout = setTimeout(() => fetchCustomer(id, setJointCustomer), 500);
    setFetchTimeout(timeout);
  };

  // Filter plans based on ownership and age - Trigger on ownership change too
  useEffect(() => {
    console.log("[CreateSavingAccount] Filtering plans with:", { ownershipType, primaryAge: primaryCustomer.age, jointAge: jointCustomer.age });  // Debug
    let filtered = accountPlans.filter(plan => {
      if (ownershipType === 'primary') {
        if (plan.name === 'Joint') return false;
        if (primaryCustomer.age === null) return false;  // Wait for age
        const maxAge = plan.maximum_age_required || Infinity;
        return primaryCustomer.age >= plan.minimum_age_required && primaryCustomer.age <= maxAge;
      } else {
        if (plan.name !== 'Joint') return false;
        if (primaryCustomer.age === null || jointCustomer.age === null) return false;
        return primaryCustomer.age >= 18 && jointCustomer.age >= 18;
      }
    });
    console.log("[CreateSavingAccount] Filtered plans count:", filtered.length);  // Debug
    setFilteredPlans(filtered);
  }, [ownershipType, primaryCustomer.age, jointCustomer.age, accountPlans]);  // Depend on .age only

  const handleOwnershipChange = (e) => {
    const newType = e.target.value;
    console.log("[CreateSavingAccount] Ownership changed to:", newType);  // Debug
    setOwnershipType(newType);
    // Reset customers immediately
    setPrimaryCustomer({ name: '', age: null, error: '' });
    setJointCustomer({ name: '', age: null, error: '' });
    setCustomerId('');
    setJointCustomerId('');
    // Force re-filter (though useEffect will trigger)
    setFilteredPlans([]);
  };

  // handleSubmit (added branch check log)
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[CreateSavingAccount] Submit with branch:", agentBranch);  // Debug
    setLoading(true);

    if (!agentBranch.id) {
      alert("No branch assigned to your account. Contact admin.");
      setLoading(false);
      return;
    }

    if (ownershipType === 'joint' && (!primaryCustomer.age || !jointCustomer.age || primaryCustomer.age < 18 || jointCustomer.age < 18)) {
      alert("Both customers must be at least 18 for joint accounts");
      setLoading(false);
      return;
    }

    if (ownershipType === 'primary' && !primaryCustomer.age) {
      alert("Enter a valid primary customer");
      setLoading(false);
      return;
    }

    if (filteredPlans.length === 0 && accountPlans.length > 0) {
      alert("No suitable plans available for the selected customer(s) - try another age");
      setLoading(false);
      return;
    }

    if (accountPlans.length === 0) {
      alert("No plans loaded - check API");
      setLoading(false);
      return;
    }

    setPrimaryCustomer(prev => ({ ...prev, error: '' }));
    setJointCustomer(prev => ({ ...prev, error: '' }));

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.branch_id = agentBranch.id;

    console.log("Form data sent:", data);

    try {
      const response = await fetch("/api/create-saving-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create saving account");
      }

      alert("Saving account created successfully!");
      e.target.reset();
      setPrimaryCustomer({ name: '', age: null, error: '' });
      setJointCustomer({ name: '', age: null, error: '' });
      setCustomerId('');
      setJointCustomerId('');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic fields - Branch first, always show
  const fields = [
    {
      label: "Branch",
      id: "branchDisplay",
      name: "branch_display",
      type: "text",
      required: false,
      value: agentBranch.loading ? 'Loading...' : agentBranch.name,
      disabled: true,
      info: agentBranch.id ? `ID: ${agentBranch.id}` : '',
    },
    {
      label: "Ownership Type",
      id: "ownershipType",
      name: "ownership_type",
      type: "select",
      required: true,
      options: [
        { label: "Primary", value: "primary" },
        { label: "Joint", value: "joint" },
      ],
      onChange: handleOwnershipChange,
      value: ownershipType,
    },
    {
      label: "Primary Customer ID",
      id: "customerId",
      name: "customer_id",
      type: "text",
      required: true,
      value: customerId,
      onChange: handlePrimaryCustomerChange,
      info: primaryCustomer.name ? `Name: ${primaryCustomer.name}, Age: ${primaryCustomer.age}` : '',
      error: primaryCustomer.error,
    },
    ...(ownershipType === "joint"
      ? [{
          label: "Joint Customer ID",
          id: "jointCustomerId",
          name: "joint_customer_id",
          type: "text",
          required: true,
          value: jointCustomerId,
          onChange: handleJointCustomerChange,
          info: jointCustomer.name ? `Name: ${jointCustomer.name}, Age: ${jointCustomer.age}` : '',
          error: jointCustomer.error,
        }]
      : []),
    {
      label: "Account Plan",
      id: "accountPlanName",
      name: "account_plan_name",
      type: "select",
      required: true,
      options: filteredPlans.length > 0
        ? filteredPlans.map((plan) => ({
            label: `${plan.name} (Age: ${plan.minimum_age_required}-${plan.maximum_age_required || 'No max'}, Rate: ${plan.interest_rate}%)`,
            value: plan.name,
          }))
        : accountPlans.length > 0
          ? accountPlans.map((plan) => ({  // Fallback: Show all if filtered empty
              label: `[Unfiltered] ${plan.name} (Age: ${plan.minimum_age_required}-${plan.maximum_age_required || 'No max'}, Rate: ${plan.interest_rate}%)`,
              value: plan.name,
            }))
          : [{ label: "No plans loaded", value: "none" }],
      info: filteredPlans.length === 0 && accountPlans.length > 0 ? 'Enter customer to filter' : (plansError || ''),
    },
  ];

  return (
    <div className="px-6 py-12 lg:px-8">
      <a
        onClick={() => changePage("Dashboard")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <h2 className="mt-10 text-gray-900 text-2xl/9 font-bold tracking-tight">
        Create Saving Account
      </h2>

      <form className="w-full max-w-3xl mt-10" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col mb-4">
            <div className="flex items-center">
              <label className="text-sm/6 font-medium text-gray-400" htmlFor={field.id}>
                {field.label}:
              </label>
              {field.required && <p className="text-red-500 font-medium">*</p>}
            </div>
            {field.type === "select" ? (
              <select
                id={field.id}
                name={field.name}
                required={field.required}
                value={field.value || ''}
                onChange={field.onChange}
                className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                id={field.id}
                name={field.name}
                value={field.value || ''}
                onChange={field.onChange}
                required={field.required}
                disabled={field.disabled}
                className={`rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            )}
            {field.info && <p className="text-sm text-gray-600 mt-1">{field.info}</p>}
            {field.error && <p className="text-sm text-red-500 mt-1">{field.error}</p>}
          </div>
        ))}

        <div>
          <p className="text-sm/6 my-4 italic text-red-500">* Required fields</p>
        </div>

        <button
          type="submit"
          disabled={loading || (filteredPlans.length === 0 && accountPlans.length === 0) || !agentBranch.id}
          className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
            loading || (filteredPlans.length === 0 && accountPlans.length === 0) || !agentBranch.id
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-400"
          } cursor-pointer`}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}