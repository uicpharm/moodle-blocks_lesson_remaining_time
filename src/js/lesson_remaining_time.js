/**
 * This inspects the bits of data written on the server side for `block_lesson_remaining_time`,
 * calculates how much time is remaining, and outputs the result to the container. Since PHP and
 * Moodle operate with the UNIX epoch in seconds, we keep all calculations in seconds, not ms.
 *
 * Moodle keeps multiple `lesson_timer` records for the user's viewing of a lesson. For instance,
 * if they log out and login again, a new record is created. So, we receive `prevTotal` time that
 * reflects that past records when calculating the total time. This makes our timer exactly match
 * what Moodle says and expects.
 */

/**
 * All data stored by this block is in this object.
 */
const lessonRemainingTimeData = {
   /**
    * The delta between epoch time of server and client, in seconds. We use this to calculate the
    * remaining time accurate to what the *server* thinks.
    */
   serverClientDelta: 0,

   /**
    * Total calculated time of past lesson timer records not including the current one, in seconds.
    * This time gets deducted from the total remaining time.
    */
   prevTotal: 0,

   /**
    * The epoch time of the current lesson timer record on Moodle. We use this to calculate the
    * current time for the current timer.
    */
   startTime: 0,

   /**
    * Total required time for the lesson, in seconds.
    */
   requiredTime: 0,

   /**
    * Dictionary for phrases written by JavaScript.
    */
   lang: {},
};

function updateLessonRemainingTime() {
   const data = lessonRemainingTimeData;
   const { lang } = data;
   const now = Math.floor(Date.now() / 1000) - data.serverClientDelta;
   // Divide by 6 and get the integer, then divide by 10, means we truncate at 1 decimal (##.#)
   const remain = Math.floor((data.startTime + data.requiredTime - now - data.prevTotal) / 6) / 10;
   const pct = remain <= 0 ? 100 : ((data.requiredTime - remain * 60) * 100) / data.requiredTime;
   const output = remain > 0 ? `${lang.remainingTime}: ${remain}&nbsp;${lang.minutes}` : lang.complete;
   // For efficiency, only update DOM if our message changed
   if (data.output !== output) {
      const section = Array.from(document.querySelectorAll('section.block_lesson_remaining_time .dynamic'));
      for (let i = 0; i < section.length; i += 1) {
         section[i].innerHTML = output;
      }
      const progressDivs = Array.from(document.querySelectorAll('section.block_lesson_remaining_time .progress div'));
      for (let i = 0; i < progressDivs.length; i += 1) {
         progressDivs[i].style.width = `${pct}%`;
      }
      data.output = output;
   }
   // Only continue updating if time remains
   if (remain > 0) setTimeout(updateLessonRemainingTime, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
   const now = Math.floor(Date.now() / 1000);
   const data = lessonRemainingTimeData;
   const container = document.querySelector('section.block_lesson_remaining_time .dynamic');
   if (!container) throw new Error('No remaining time block found.');
   const lessonTime = parseInt(container.getAttribute('data-lesson-time'), 10) || now;
   data.serverClientDelta = now - lessonTime;
   data.prevTotal = parseInt(container.getAttribute('data-prev-total'), 10) || 0;
   data.startTime = parseInt(container.getAttribute('data-start-time'), 10) || now;
   data.requiredTime = (parseInt(container.getAttribute('data-required-min'), 10) || 0) * 60;
   data.lang = JSON.parse(container.getAttribute('data-lang'));
   console.log('Remaining Time block initialized!', data);
   updateLessonRemainingTime();
});
