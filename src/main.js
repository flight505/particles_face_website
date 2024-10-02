// ===== Filename: src/main.js =====

import './scss/style.scss'  // Import the main SCSS file
import MainScene from './js/components/scene.js'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'

gsap.registerPlugin(Draggable)

window.addEventListener('load', () => {
    console.log('Window loaded')
    initializeApp()
})

function initializeApp() {
    console.log('Initializing app')
    const mainScene = new MainScene()
    console.log('MainScene initialized:', mainScene)

    const cursor = document.querySelector(".cursor")
    const homeloaderblack = document.querySelector(".homeloaderblack")
    const sections = document.querySelectorAll('section')
    const menuItems = document.querySelectorAll('.target')

    console.log('Cursor element:', cursor)
    console.log('Homeloaderblack element:', homeloaderblack)
    console.log('Sections:', sections)
    console.log('Menu items:', menuItems)

    let cursorPosition = { x: 0, y: 0 }
    let animationFrameId = null

    function updateCursor(e) {
        cursorPosition.x = e.clientX
        cursorPosition.y = e.clientY

        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animateCursor)
        }
    }

    function animateCursor() {
        animationFrameId = null;

        let closestTarget = null;
        let closestDistance = Infinity;

        homeloaderblack.querySelectorAll('.target').forEach(target => {
            const rect = target.getBoundingClientRect();
            const targetCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            const distance = Math.hypot(
                targetCenter.x - cursorPosition.x,
                targetCenter.y - cursorPosition.y
            );

            if (distance < closestDistance) {
                closestTarget = target;
                closestDistance = distance;
            }
        });

        if (closestTarget && closestDistance < closestTarget.getBoundingClientRect().width) {
            const textElement = closestTarget.querySelector('.text');
            const textRect = textElement.getBoundingClientRect();

            gsap.to(cursor, {
                left: textRect.left,
                top: textRect.bottom + 2, // Position the bar 2px below the text
                width: textRect.width,
                height: 2, // Height of the bar
                borderRadius: 0, // Make it a rectangle
                backgroundColor: 'rgba(0, 0, 3, 0.5)', // Keep the same color
                duration: 0.2,
                xPercent: 0, // Ensure the bar is not offset
                yPercent: 0
            });

            gsap.to(textElement, {
                y: -2, // Slight upward movement of text
                duration: 0.2
            });
        } else {
            gsap.to(cursor, {
                left: cursorPosition.x,
                top: cursorPosition.y,
                width: 12,
                height: 12,
                borderRadius: '50%',
                duration: 0.2,
                xPercent: -50, // Center the circular cursor
                yPercent: -50
            });

            homeloaderblack.querySelectorAll('.target .text').forEach(textElement => {
                gsap.to(textElement, {
                    y: 0,
                    duration: 0.2
                });
            });
        }
    }

    function handleNavigation(targetText) {
        console.log(`Navigating to: ${targetText}`)

        sections.forEach(section => {
            section.style.display = 'none'
            section.classList.remove('active')
        })

        const targetSection = document.getElementById(targetText.toLowerCase())
        if (targetSection) {
            targetSection.style.display = 'block'
            targetSection.classList.add('active')
            targetSection.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' // Add visible feedback
        } else {
            console.log(`Section "${targetText}" not found.`)
        }
    }

    // Use event delegation for better performance
    homeloaderblack.addEventListener('click', (event) => {
        const target = event.target.closest('.target')
        if (target) {
            const textElement = target.querySelector('.text')
            const targetText = textElement ? textElement.textContent.trim() : null

            if (targetText) {
                console.log(`Menu item clicked: ${targetText}`)
                handleNavigation(targetText)
            } else {
                console.log('Clicked target has no .text element.')
            }
        }
    })

    // Add individual click event listeners to each menu item
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const textElement = item.querySelector('.text')
            const targetText = textElement ? textElement.textContent.trim() : null

            if (targetText) {
                console.log(`Menu item clicked directly: ${targetText}`)
                handleNavigation(targetText)
            } else {
                console.log('Clicked menu item has no .text element.')
            }
        })
    })

    const contactForm = document.getElementById('contact-form')
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault()
            const email = document.getElementById('email').value
            const message = document.getElementById('message').value
            console.log(`Form submitted: Email - ${email}, Message - ${message}`)
            contactForm.reset()
        })
    }

    document.addEventListener("mousemove", updateCursor, { passive: true })

    // Add a simple click event listener to the body
    document.body.addEventListener('click', (event) => {
        console.log(`Body clicked: ${event.target.tagName}`)
    })

    // Initialize the home section as active
    handleNavigation('Home')
}