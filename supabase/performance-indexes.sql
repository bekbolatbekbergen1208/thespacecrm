-- Safe performance indexes for CRM.Space.
-- Run this file in Supabase SQL Editor after the main schemas.

create index if not exists company_members_user_created_idx
on public.company_members (user_id, created_at);

create index if not exists company_members_company_role_idx
on public.company_members (company_id, role);

create index if not exists employee_access_requests_company_status_created_idx
on public.employee_access_requests (company_id, status, created_at);

create index if not exists employees_company_user_idx
on public.employees (company_id, user_id);

create index if not exists employees_company_created_idx
on public.employees (company_id, created_at desc);

create index if not exists customers_company_created_idx
on public.customers (company_id, created_at desc);

create index if not exists tasks_company_status_due_idx
on public.tasks (company_id, status, due_date);

create index if not exists inventory_items_company_quantity_idx
on public.inventory_items (company_id, quantity, reorder_level);

create index if not exists retail_products_company_status_created_idx
on public.retail_products (company_id, status, created_at desc);

create index if not exists retail_products_company_category_created_idx
on public.retail_products (company_id, category, created_at desc);

create index if not exists retail_products_company_address_created_idx
on public.retail_products (company_id, address, created_at desc);

create index if not exists retail_product_sales_company_date_idx
on public.retail_product_sales (company_id, sale_date desc);

create index if not exists retail_product_sales_company_product_created_idx
on public.retail_product_sales (company_id, product_id, created_at desc);

create index if not exists retail_debts_company_status_created_idx
on public.retail_debts (company_id, status, created_at desc);

create index if not exists bakery_shops_company_created_idx
on public.bakery_shops (company_id, created_at desc);

create index if not exists bakery_stock_company_date_idx
on public.bakery_stock (company_id, stock_date desc);

create index if not exists bakery_sales_company_date_idx
on public.bakery_sales (company_id, sale_date desc);

create index if not exists bakery_sales_company_shop_date_idx
on public.bakery_sales (company_id, shop_id, sale_date desc);

create index if not exists bakery_products_company_status_created_idx
on public.bakery_products (company_id, status, created_at desc);

create index if not exists bakery_product_sales_company_date_idx
on public.bakery_product_sales (company_id, sale_date desc);

create index if not exists bakery_delivery_routes_company_date_idx
on public.bakery_delivery_routes (company_id, route_date desc);

create index if not exists bakery_clients_company_created_idx
on public.bakery_clients (company_id, created_at desc);

create index if not exists robotics_students_company_group_created_idx
on public.robotics_students (company_id, group_name, created_at desc);

create index if not exists robotics_students_company_mentor_created_idx
on public.robotics_students (company_id, mentor_name, created_at desc);

create index if not exists robotics_groups_company_mentor_created_idx
on public.robotics_groups (company_id, mentor_name, created_at desc);

create index if not exists robotics_payments_company_paid_at_idx
on public.robotics_payments (company_id, paid_at desc);

create index if not exists robotics_attendance_company_lesson_date_idx
on public.robotics_attendance (company_id, lesson_date desc);

create index if not exists robotics_lessons_company_date_time_idx
on public.robotics_lessons (company_id, lesson_date, lesson_time);

create index if not exists robotics_trial_lessons_company_date_idx
on public.robotics_trial_lessons (company_id, trial_date desc);

create index if not exists robotics_subscriptions_company_student_created_idx
on public.robotics_subscriptions (company_id, student_name, created_at desc);

create index if not exists robotics_grades_company_date_idx
on public.robotics_grades (company_id, grade_date desc);

notify pgrst, 'reload schema';
