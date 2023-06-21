from tkinter import *
import tkinter as tk
from tkinter import ttk
from tkinter import Tk
from datetime import datetime
from database import Database
import uuid

class Timing(tk.Toplevel):
    alive = False

    def __init__(self, * args, **kwargs):
        super().__init__(*args, **kwargs)
        self.title("Timing")
        self.geometry("600x700")
        self.minsize(600, 700)
        self.__class__.alive=True
        # frame = Frame(self, borderwidth=2, relief="flat")
        # frame.grid(column=0, row=0, sticky=(N, E, S, W))
        
        self.course(0, self)
        self.course(1, self)

        self.columnconfigure(2)
        self.rowconfigure(1)
        

    def course(self, num, frame_name):
        frame_color = ''
        frame_label = ''
        if(num == 0):
            frame_color = "orange"
            frame_label = 'orange'
        else:
            frame_color = "green"
            frame_label = 'green'
        framecourse = Frame(frame_name, borderwidth=2, relief="solid", bg=frame_color)
        framecourse.grid(column=num, row=0, sticky=(N, E, S, W))

        course_label = Label(framecourse, text=frame_label, bg=frame_color)
        course_label.grid(column=1, row=1)

        # Bib Lookup
        lookup_label = Label(framecourse, text="Bib Lookup", bg=frame_color)
        lookup_label.grid(column=1, row=2)
        if(num == 0):
            self.orange_lookup_entry_value = StringVar()
            self.orange_lookup_entry = Entry(framecourse, textvariable=self.orange_lookup_entry_value)
            
            self.orange_lookup_entry.grid(column=2, row=2)

            self.orange_search_button = Button(framecourse, text="Search", command=self.orange_search)
            self.orange_search_button.grid(column=3, row=2)
        else:
            self.green_lookup_entry_value = StringVar()
            self.green_lookup_entry = Entry(framecourse)
            
            self.green_lookup_entry.grid(column=2, row=2)

            self.green_search_button = Button(framecourse, text="Search", command=self.green_search)
            self.green_search_button.grid(column=3, row=2)

        if(num == 0):
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
            self.orange_signin.insert("", tk.END, iid="On_Deck_Orange", values=["FA", "", "A"])

            # on course
            orange_timing_label = Label(framecourse, text="On Course", bg=frame_color)
            orange_timing_label.grid(column=1, row = 5)

            self.orange_on_course = ttk.Treeview(framecourse, column=("c1", "c2", "c3", "c4", "c5", "c6"), show='headings', height=3)

            ## ID
            self.orange_on_course.column("#1", anchor=tk.W, width=50)
            self.orange_on_course.heading("#1", text="ID")

            ## Name
            self.orange_on_course.column("#2", anchor=tk.W, width=160)
            self.orange_on_course.heading("#2", text="Name")

            ## Discipline
            self.orange_on_course.column("#3", anchor=tk.W, width=30)
            self.orange_on_course.heading("#3", text="Time")

            ## Result UUID
            self.orange_on_course.column("#4", anchor=tk.W, width=30)
            self.orange_on_course.heading("#4", text="Result UUID")

            ## Result UUID
            self.orange_on_course.column("#5", anchor=tk.W, width=30)
            self.orange_on_course.heading("#5", text="Start Time")

            ## Running clock
            ## Result UUID
            self.orange_on_course.column("#6", anchor=tk.W, width=30)
            self.orange_on_course.heading("#6", text="Run Time")

            self.orange_on_course["displaycolumns"]=("0", "1", "2", "5")
            self.orange_on_course.grid(column = 1, row = 6, columnspan=4, padx=20, pady=(0,40))

            # Results
            orange_timing_label = Label(framecourse, text="Results", bg=frame_color)
            orange_timing_label.grid(column=1, row = 8)

            self.orange_results = ttk.Treeview(framecourse, column=("c1", "c2", "c3", "c4", "c5", "c6", "c7"), show='headings', height=10)
            ##ID
            self.orange_results.column("#1", anchor=tk.W, width=50, stretch=True)
            self.orange_results.heading("#1", text="ID")

            ## Name
            self.orange_results.column("#2", anchor=tk.W, width=160, stretch=True)
            self.orange_results.heading("#2", text="Name")

            ## Discipline
            self.orange_results.column("#3", anchor=tk.W, width=30, stretch=True)
            self.orange_results.heading("#3", text="Discipline")

            ## Result UUID
            self.orange_results.column("#4", anchor=tk.W, width=0, stretch=False)
            self.orange_results.heading("#4", text="Result UUID")

            ## Start Time
            self.orange_results.column("#5", anchor=tk.W, width=0, stretch=False)

            ## End Time
            self.orange_results.column("#6", anchor=tk.W, width=0, stretch=False)

            ## Result
            self.orange_results.column("#7", anchor=tk.W, width=30, stretch=True)
            self.orange_results.heading("#7", text="Result")
            self.orange_results["displaycolumns"]=("0", "1", "2", "6")
            self.orange_results.grid(column = 1, row = 9, columnspan=4, padx=20, pady=(0,40))

            # Pacesetter
            orange_pacesetter_name_label = Label(framecourse, text="Pacesetter: ",bg=frame_color)
            orange_pacesetter_name_label.grid(column = 1, row = 11)

            # Pacesetter Time
            orange_pacesetter_time_label = Label(framecourse, text="Time: ", bg=frame_color)
            orange_pacesetter_time_label.grid(column=1, row=12)

            # Par Time
            orange_par_time_label = Label(framecourse, text="Par Time:", bg=frame_color)
            orange_par_time_label.grid(column = 1, row = 13)
            self.orange_start(framecourse)
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

            # ID
            green_on_course.column("#1", anchor=tk.W, width=50)
            green_on_course.heading("#1", text="ID")

            # Name
            green_on_course.column("#2", anchor=tk.W, width=160)
            green_on_course.heading("#2", text="Name")

            # Discipline
            green_on_course.column("#3", anchor=tk.W, width=30)
            green_on_course.heading("#3", text="Disc.")



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
            self.green_start(framecourse)

    def green_start(self, frame_name):
        w=Label(frame_name, text="Green Start")
        def green_start_pressed(event):
            w.grid(column=1, row=14)
        
        def green_end_pressed(event):
            w.grid_forget()
            

        self.bind("<F3>", green_start_pressed)
        self.bind("<F4>", green_end_pressed)

    def orange_start(self, frame_name):
        w=Label(frame_name, text="Orange Start")
        def orange_start_pressed(event):
            self.orange_racer_on_course()
            w.grid(column=1, row=14)

        def orange_end_pressed(event):
            self.orange_racer_finish()
            w.grid_forget()

        self.bind("<F1>", orange_start_pressed)
        self.bind("<F2>", orange_end_pressed)

    def orange_search(self):
        search_value = self.orange_lookup_entry.get()
        # print(search_value)
        result = Database.search_participant(search_value)
        if (result == None):
            print("No results")
        else:
            try:
                self.orange_signin.delete("On_Deck_Orange")
            # print(result)
            except TclError:
                pass
            finally:
                self.orange_signin.insert("", 0, iid="On_Deck_Orange", values=result)
                self.orange_lookup_entry_value.set("")

    
    def orange_racer_on_course(self):
        racer = self.orange_signin.item('On_Deck_Orange')
        # print(racer)
        if(racer != None):
            result_uuid = uuid.uuid4().bytes
            self.orange_on_course.insert("", 'end', iid=result_uuid, values=self.orange_signin.item('On_Deck_Orange')['values']+[result_uuid, datetime.now()])
            self.orange_signin.delete('On_Deck_Orange')
            self.orange_signin.insert("", 0, iid="On_Deck_Orange", values=["FA", "", "A"])
    
    def orange_racer_finish(self):

        print(self.orange_on_course.get_children())
        if(self.orange_on_course.get_children() != ()):
            on_course = self.orange_on_course.get_children()
            racer = on_course[0]
            #print(racer)
            if(racer != None):
                result = self.orange_on_course.item(racer)['values']+[datetime.now()]
                print(result)
                # stop = datetime.strptime(result[5],'%Y-%m-%d %H:%M:%S.%f')
                # print(stop)

                start = datetime.strptime(result[4],'%Y-%m-%d %H:%M:%S.%f')
                # print(start)

                time_result = self.clean_time(str(result[5] - start))
                print(time_result)
                self.orange_results.insert("", 0, iid=racer, values=result+[time_result])
                Database.store_result("race_uuid",result[3], result[0], "local_uuid", "world_uuid", result[4], result[5], time_result, "orange")
                self.orange_on_course.delete(racer)

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
    
    def clean_time(self, time):
        if(time[0] == "0" and time[1] == ":"):
            new_time = time[2:]
            if(time[2]=="0" and time[3]=="0" and time[4]==":"):
                new_time = time[5:]
                if(time[5]=="0"):
                    new_time = time[6:]
            return new_time
        else:
            return time


