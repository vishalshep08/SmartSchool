-- Insert sample classes for the school
INSERT INTO public.classes (name, grade, section, academic_year) VALUES
('Class 1', 1, 'A', '2024-25'),
('Class 1', 1, 'B', '2024-25'),
('Class 2', 2, 'A', '2024-25'),
('Class 2', 2, 'B', '2024-25'),
('Class 3', 3, 'A', '2024-25'),
('Class 3', 3, 'B', '2024-25'),
('Class 4', 4, 'A', '2024-25'),
('Class 4', 4, 'B', '2024-25'),
('Class 5', 5, 'A', '2024-25'),
('Class 5', 5, 'B', '2024-25'),
('Class 6', 6, 'A', '2024-25'),
('Class 7', 7, 'A', '2024-25'),
('Class 8', 8, 'A', '2024-25'),
('Class 9', 9, 'A', '2024-25'),
('Class 10', 10, 'A', '2024-25');

-- Insert sample events for the school calendar
INSERT INTO public.events (title, description, start_date, end_date, event_type, is_holiday) VALUES
('Independence Day', 'National holiday celebration with flag hoisting ceremony', '2025-01-26', '2025-01-26', 'holiday', true),
('Republic Day', 'Republic Day celebrations', '2025-01-26', '2025-01-26', 'holiday', true),
('Annual Sports Day', 'Inter-class sports competition', '2025-02-15', '2025-02-15', 'sports', false),
('Parent-Teacher Meeting', 'Quarterly PTM for all classes', '2025-01-20', '2025-01-20', 'event', false),
('Half-Yearly Exams Begin', 'Mid-term examinations for all classes', '2025-03-01', '2025-03-15', 'exam', false),
('Holi Holiday', 'Festival of Colors', '2025-03-14', '2025-03-14', 'holiday', true),
('Summer Vacation Begins', 'Summer break for students', '2025-05-01', '2025-06-15', 'holiday', true),
('Science Exhibition', 'Annual science fair showcasing student projects', '2025-02-28', '2025-02-28', 'event', false),
('Diwali Vacation', 'Diwali festival holidays', '2025-10-20', '2025-10-25', 'holiday', true),
('Annual Day Celebration', 'Annual function with cultural programs', '2025-12-20', '2025-12-20', 'celebration', false);