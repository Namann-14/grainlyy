import Layout from './Layout';

export default function PublicLayout({ children }) {
  return (
    <Layout>
      <div className="flex min-h-screen">
        <aside className="w-64 bg-blue-800 text-white">
          <div className="p-4">
            <h2 className="text-xl font-bold">Public Portal</h2>
          </div>
          <nav className="mt-6">
            <a href="/public" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700">
              Dashboard
            </a>
            <a href="/public/deliveries" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700">
              All Deliveries
            </a>
            <a href="/public/dealers" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700">
              Dealers
            </a>
            <a href="/public/complaints" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700">
              Submit Complaint
            </a>
          </nav>
        </aside>
        
        <div className="flex-1">
          {children}
        </div>
      </div>
    </Layout>
  );
}