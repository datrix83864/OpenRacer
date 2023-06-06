from tkinter import *
import tkinter as tk
from tkinter import ttk
from database import Database

class Timing(tk.Toplevel):
    alive = False

    def __init__(self, * args, **kwargs):
        super().__init__(*args, **kwargs)
        self.title("Timing")
        self.geometry("800x800")
        self.minsize(400, 400)
        self.__class__.alive=True

        frame = Frame(self, borderwidth=2, relief="flat")
        frame.grid(column=1, row=1, sticky=(N, E, S, W))
        self.columnconfigure(1, weight=1)
        self.rowconfigure(1, weight=1)

        self.course(frame, 1)
        self.course(frame, 2)

    def course(self, frame_name, num):
        frame_color = ''
        frame_label = ''
        if(num == 1):
            frame_color = "orange"
            frame_label = 'orange'
        else:
            frame_color = "green"
            frame_label = 'green'
        framecourse = Frame(frame_name, borderwidth=2, relief="solid", bg=frame_color)
        framecourse.grid(column=num, row=1, sticky=(N, E, S, W))

        course_label = Label(framecourse, text=frame_label, bg=frame_color)
        course_label.grid(column=1, row=1)

        # Bib Lookup
        lookup_label = Label(framecourse, text="Bib Lookup", bg=frame_color)
        lookup_label.grid(column=1, row=2)
        if(num == 1):
            self.orange_lookup_entry_value = StringVar()
            self.orange_lookup_entry = Entry(framecourse)
            
            self.orange_lookup_entry.grid(column=2, row=2)

            self.orange_search_button = Button(framecourse, text="Search", command=self.orange_search)
            self.orange_search_button.grid(column=3, row=2)
        else:
            self.green_lookup_entry_value = StringVar()
            self.green_lookup_entry = Entry(framecourse)
            
            self.green_lookup_entry.grid(column=2, row=2)

            self.green_search_button = Button(framecourse, text="Search", command=self.green_search)
            self.green_search_button.grid(column=3, row=2)

        if(num == 1):
            # On Deck
            orange_signin_label = Label(framecourse, text="On Deck", bg=frame_color)
            orange_signin_label.grid(column=1, row=3)
            
            self.orange_signin = ttk.Treeview(framecourse, column=("c1", "c2", "c3"), show='headings', height=1)

            self.orange_signin.column("#1", anchor=tk.W, width=50)

            self.orange_signin.heading("#1", text="ID")

            self.orange_signin.column("#2", anchor=tk.W, width=160)

            self.orange_signin.heading("#2", text="Name")

            self.orange_signin.column("#3", anchor=tk.W, width=30)

            self.orange_signin.heading("#3", text="Disc.")

            self.orange_signin.grid(column = 1, row = 4, columnspan=4, padx=20, pady=(0,40))

            # on course
            orange_timing_label = Label(framecourse, text="On Course", bg=frame_color)
            orange_timing_label.grid(column=1, row = 5)

            orange_on_course = ttk.Treeview(framecourse, column=("c1", "c2", "c3"), show='headings', height=3)

            orange_on_course.column("#1", anchor=tk.W, width=50)

            orange_on_course.heading("#1", text="ID")

            orange_on_course.column("#2", anchor=tk.W, width=160)

            orange_on_course.heading("#2", text="Name")

            orange_on_course.column("#3", anchor=tk.W, width=30)

            orange_on_course.heading("#3", text="Time")

            orange_on_course.grid(column = 1, row = 6, columnspan=4, padx=20, pady=(0,40))

            # Results
            orange_timing_label = Label(framecourse, text="Results", bg=frame_color)
            orange_timing_label.grid(column=1, row = 8)

            orange_results = ttk.Treeview(framecourse, column=("c1", "c2", "c3"), show='headings', height=10)

            orange_results.column("#1", anchor=tk.W, width=50)

            orange_results.heading("#1", text="ID")

            orange_results.column("#2", anchor=tk.W, width=160)

            orange_results.heading("#2", text="Name")

            orange_results.column("#3", anchor=tk.W, width=30)

            orange_results.heading("#3", text="Time")

            orange_results.grid(column = 1, row = 9, columnspan=4, padx=20, pady=(0,40))

            # Pacesetter
            orange_pacesetter_name_label = Label(framecourse, text="Pacesetter: ",bg=frame_color)
            orange_pacesetter_name_label.grid(column = 1, row = 11)

            # Pacesetter Time
            orange_pacesetter_time_label = Label(framecourse, text="Time: ", bg=frame_color)
            orange_pacesetter_time_label.grid(column=1, row=12)

            # Par Time
            orange_par_time_label = Label(framecourse, text="Par Time:", bg=frame_color)
            orange_par_time_label.grid(column = 1, row = 13)
        else:
            # On Deck
            green_signin_label = Label(framecourse, text="On Deck", bg=frame_color)
            green_signin_label.grid(column=1, row=3)
            
            self.green_signin = ttk.Treeview(framecourse, column=("c1", "c2", "c3"), show='headings', height=1)

            self.green_signin.column("#1", anchor=tk.W, width=50)

            self.green_signin.heading("#1", text="ID")

            self.green_signin.column("#2", anchor=tk.W, width=160)

            self.green_signin.heading("#2", text="Name")

            self.green_signin.column("#3", anchor=tk.W, width=30)

            self.green_signin.heading("#3", text="Disc.")

            self.green_signin.grid(column = 1, row = 4, columnspan=4, padx=20, pady=(0,40))

            # on course
            green_timing_label = Label(framecourse, text="On Course", bg=frame_color)
            green_timing_label.grid(column=1, row = 5)

            green_on_course = ttk.Treeview(framecourse, column=("c1", "c2", "c3"), show='headings', height=3)

            green_on_course.column("#1", anchor=tk.W, width=50)

            green_on_course.heading("#1", text="ID")

            green_on_course.column("#2", anchor=tk.W, width=160)

            green_on_course.heading("#2", text="Name")

            green_on_course.column("#3", anchor=tk.W, width=30)

            green_on_course.heading("#3", text="Time")

            green_on_course.grid(column = 1, row = 6, columnspan=4, padx=20, pady=(0,40))

            # Results
            green_timing_label = Label(framecourse, text="Results", bg=frame_color)
            green_timing_label.grid(column=1, row = 8)

            green_results = ttk.Treeview(framecourse, column=("c1", "c2", "c3"), show='headings', height=10)

            green_results.column("#1", anchor=tk.W, width=50)

            green_results.heading("#1", text="ID")

            green_results.column("#2", anchor=tk.W, width=160)

            green_results.heading("#2", text="Name")

            green_results.column("#3", anchor=tk.W, width=30)

            green_results.heading("#3", text="Time")

            green_results.grid(column = 1, row = 9, columnspan=4, padx=20, pady=(0,40))

            # Pacesetter
            green_pacesetter_name_label = Label(framecourse, text="Pacesetter: ",bg=frame_color)
            green_pacesetter_name_label.grid(column = 1, row = 11)

            # Pacesetter Time
            green_pacesetter_time_label = Label(framecourse, text="Time: ", bg=frame_color)
            green_pacesetter_time_label.grid(column=1, row=12)

            # Par Time
            green_par_time_label = Label(framecourse, text="Par Time:", bg=frame_color)
            green_par_time_label.grid(column = 1, row = 13)

    def orange_search(self):
        search_value = self.orange_lookup_entry.get()
        # print(search_value)
        result = Database.search_participant(search_value)
        if (result == None):
            print("No results")
        else:
            self.orange_signin.delete()
            print(result)
            self.orange_signin.insert("", tk.END, values=result)

    def green_search(self):
        search_value = self.green_lookup_entry.get()
        # print(search_value)
        result = Database.search_participant(search_value)
        if (result == None):
            print("No results")
        else:
            self.green_signin.delete()
            print(result)
            self.green_signin.insert("", tk.END, values=result)

    def destroy(self):
        self.__class__.alive = False
        return super().destroy()