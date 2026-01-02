import React from 'react';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';
import { Plus } from 'lucide-react';

const AddStockForm = ({ products, onSubmit, isLoading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const handleFormSubmit = async (data) => {
      // Ensure types are correct for the backend
      const formattedData = {
          ...data,
          mrp: Number(data.mrp),
          costPrice: Number(data.costPrice),
          quantity: Number(data.quantity)
      };
      await onSubmit(formattedData);
      reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">Add New Batch</h2>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
            Product
          </label>
          <div className="mt-1">
            <select
              id="productId"
              {...register('productId', { required: 'Product is required' })}
              className={clsx(
                "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border",
                errors.productId && "border-red-300"
              )}
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
            {errors.productId && <p className="mt-1 text-sm text-red-600">{errors.productId.message}</p>}
          </div>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700">
            Batch Number
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="batchNumber"
              {...register('batchNumber', { required: 'Batch Number is required' })}
              className={clsx(
                "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border",
                errors.batchNumber && "border-red-300"
              )}
            />
            {errors.batchNumber && <p className="mt-1 text-sm text-red-600">{errors.batchNumber.message}</p>}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">
            Expiry Date
          </label>
          <div className="mt-1">
            <input
              type="date"
              id="expiryDate"
              {...register('expiryDate', { required: 'Expiry Date is required' })}
              className={clsx(
                "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border",
                errors.expiryDate && "border-red-300"
              )}
            />
            {errors.expiryDate && <p className="mt-1 text-sm text-red-600">{errors.expiryDate.message}</p>}
          </div>
        </div>

         <div className="sm:col-span-2">
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <div className="mt-1">
            <input
              type="number"
              id="quantity"
              min="0"
              {...register('quantity', { required: 'Quantity is required', min: 0 })}
              className={clsx(
                "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border",
                errors.quantity && "border-red-300"
              )}
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
          </div>
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="mrp" className="block text-sm font-medium text-gray-700">
            MRP
          </label>
          <div className="mt-1">
            <input
              type="number"
              id="mrp"
              step="0.01"
              min="0"
              {...register('mrp', { required: 'MRP is required', min: 0 })}
              className={clsx(
                "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border",
                errors.mrp && "border-red-300"
              )}
            />
            {errors.mrp && <p className="mt-1 text-sm text-red-600">{errors.mrp.message}</p>}
          </div>
        </div>

        <div className="sm:col-span-1">
           <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700">
            Cost Price
          </label>
          <div className="mt-1">
            <input
              type="number"
              id="costPrice"
              step="0.01"
              min="0"
              {...register('costPrice', { required: 'Cost Price is required', min: 0 })}
              className={clsx(
                "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border",
                 errors.costPrice && "border-red-300"
              )}
            />
            {errors.costPrice && <p className="mt-1 text-sm text-red-600">{errors.costPrice.message}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : (
             <>
               <Plus className="w-4 h-4 mr-2" />
               Add Batch
             </>
          )}
        </button>
      </div>
    </form>
  );
};

export default AddStockForm;
