import tkinter as tk
from tkinter import ttk
from registration import *
class MainWindow(tk.Tk):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.config(width=400, height=300)
        self.title("Main Window")
        self.button_open = ttk.Button(
            self,
            text="Registration",
            command=self.open_registration_window
        )
        self.button_open.place(x=100, y=100)

    def open_registration_window(self):
        if not Registration.alive:
            self.registration_window = Registration()
        else:
            self.registration_window.focus_set()


main_window = MainWindow()
main_window.mainloop()